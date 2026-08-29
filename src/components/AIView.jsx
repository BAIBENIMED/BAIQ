import { useState, useRef, useEffect } from 'react';
import { runAIAnalysis, buildGeminiContext } from '../utils/aiEngine';

/* ═══════════════════════════════════════════════════════════
   BAIQ — Assistant & Diagnostic IA Financier Approfondi
   Analyse multidimensionnelle (SCF Algérie — Loi 07-11)
   ═══════════════════════════════════════════════════════════ */

const SEVERITE_STYLE = {
  critique: { bg: '#fff1f2', border: '#fca5a5', color: '#be123c', label: 'CRITIQUE',  icon: 'dangerous'    },
  eleve:    { bg: '#fff7ed', border: '#fdba74', color: '#c2410c', label: 'ÉLEVÉ',     icon: 'warning'      },
  moyen:    { bg: '#fffbeb', border: '#fde68a', color: '#92400e', label: 'MODÉRÉ',    icon: 'info'         },
  faible:   { bg: '#f0fdf4', border: '#86efac', color: '#166534', label: 'FAIBLE',    icon: 'check_circle' },
};

const URGENCE_STYLE = {
  critique: { color: '#dc2626', bg: '#fee2e2', label: '🔴 CRITIQUE (0-15j)' },
  haute:    { color: '#ea580c', bg: '#fff7ed', label: '🟠 HAUTE (30j)'      },
  moyenne:  { color: '#d97706', bg: '#fffbeb', label: '🟡 MOYENNE (90j)'    },
  basse:    { color: '#059669', bg: '#f0fdf4', label: '🟢 STRATÉGIQUE (1 an)' },
};

export function AIView({ data, geminiKey }) {
  const [activeTab, setActiveTab]     = useState('diagnostic');
  const [inputText, setInputText]     = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  // 'checking' | 'proxy' | 'direct' | 'local' — reflète le mode Gemini réellement actif,
  // pas seulement la présence d'une clé locale (le relais serveur peut fonctionner sans elle).
  const [geminiMode, setGeminiMode]   = useState(geminiKey ? 'direct' : 'checking');
  const chatEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/gemini/status')
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (cancelled) return;
        if (json?.configured) setGeminiMode('proxy');
        else if (geminiKey) setGeminiMode('direct');
        else setGeminiMode('local');
      })
      .catch(() => {
        if (!cancelled) setGeminiMode(geminiKey ? 'direct' : 'local');
      });
    return () => { cancelled = true; };
  }, [geminiKey]);

  const isGeminiActive = geminiMode === 'proxy' || geminiMode === 'direct';

  // ── Quota d'appels IA (Gemini) dans le chat, par dossier importé ──
  // Le chat reste utilisable sans limite, mais au-delà de MAX_GEMINI_CHAT_CALLS,
  // les échanges basculent automatiquement sur le moteur local (gratuit, sans appel
  // réseau) pour éviter une consommation d'API illimitée et non maîtrisée.
  const MAX_GEMINI_CHAT_CALLS = 10;
  const dossierKey = data?.profil?.nomEntreprise
    ? `baiq_ai_quota_${data.profil.nomEntreprise}_${data?.sig?.chiffreAffaires || 0}`
    : null;
  const [geminiCallCount, setGeminiCallCount] = useState(() => {
    if (!dossierKey) return 0;
    return parseInt(localStorage.getItem(dossierKey) || '0', 10);
  });

  useEffect(() => {
    if (!dossierKey) return;
    // Resynchronise le compteur de quota au changement de dossier (composant non remonté via key).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGeminiCallCount(parseInt(localStorage.getItem(dossierKey) || '0', 10));
  }, [dossierKey]);

  const geminiQuotaExceeded = geminiCallCount >= MAX_GEMINI_CHAT_CALLS;

  const analysis = data ? runAIAnalysis(data) : null;
  const diag = analysis?.diagnosticAvance || {};
  const solv = analysis?.solvabilite || {};
  const sec  = analysis?.secteur || {};

  const fmt = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '0 DZD';
    const num = Math.round(Number(v));
    const sign = num < 0 ? '-' : '';
    return `${sign}${Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DZD`;
  };
  const pct = (v) => `${((v || 0) * 100).toFixed(1)} %`;

  const [chatMessages, setChatMessages] = useState(() => {
    if (data && analysis) {
      return [{
        role: 'assistant',
        text: `**Bonjour ! Je suis votre Conseiller Financier IA BAIQ.**\n\nJ'ai réalisé un diagnostic approfondi de votre balance comptable. Voici les conclusions fondamentales :\n\n${analysis.resume}\n\n💡 Cliquez sur une question thématique ci-dessous ou posez-moi n'importe quelle question sur vos comptes, votre BFR, vos marges ou votre solvabilité bancaire.`,
        time: new Date()
      }];
    }
    return [];
  });

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /* ── Call Gemini API ── */
  const callGemini = async (userMessage) => {
    const context = buildGeminiContext(data, analysis);
    const prompt  = context + `\n\n## QUESTION DE L'UTILISATEUR\n${userMessage}\n\nRéponds de manière structurée, hautement professionnelle et en français d'affaires. Utilise des titres, des calculs chiffrés en DZD, des listes à puces et cite les comptes SCF appropriés.`;
    const requestBody = { contents: [{ parts: [{ text: prompt }] }] };
    const modelName = 'gemini-2.0-flash';

    // 1. Voie recommandée : relais serveur /api/gemini (clé Gemini gardée côté serveur, cf. server.js)
    try {
      const proxyRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName, body: requestBody })
      });
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else if (proxyRes.status !== 404) {
        return null; // le relais existe mais a échoué (ex: clé serveur manquante) → pas la peine de tenter le mode direct
      }
    } catch {
      // relais injoignable → on tente le mode direct ci-dessous si une clé locale existe
    }

    // 2. Repli : appel direct depuis le navigateur avec une clé saisie localement (moins sûr, cf. Paramètres)
    if (!geminiKey) return null;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          body: JSON.stringify(requestBody)
        }
      );
      const json = await res.json();
      return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch {
      return null;
    }
  };

  /* ── Local AI response enrichie ── */
  const buildLocalResponse = (msg) => {
    const m   = msg.toLowerCase();
    const met = analysis?.metriques || {};

    if (m.includes('bfr') || m.includes('besoin'))
      return `**Diagnostic Approfondi du BFR (Besoin en Fonds de Roulement)**\n\n- BFR Total : **${fmt(data?.bilan?.bfr)}**, représentant **${Math.round(met.bfrJCA)} jours de CA** (Norme sectorielle : ${sec.benchmarks?.bfrJoursCA?.norme || '≤ 60j'}).\n- Délai clients (DSO) : **${Math.round(met.dso)} jours**\n- Délai fournisseurs (DPO) : **${Math.round(met.dpo)} jours**\n- Rotation des stocks : **${Math.round(met.rotS)} jours**\n\n💰 **Potentiel de Cash Libérable** : **${fmt(diag.totalCashLibérable)}**\n- Dont recouvrement clients : **${fmt(diag.gainDSO)}**\n- Dont surstockage : **${fmt(diag.gainStock)}**\n\n${met.bfrJCA > 60 ? '🚨 **Alerte BFR** : Votre cycle d\'exploitation consomme trop de liquidités. Activez le plan de recouvrement d\'urgence.' : '✅ Le BFR est sous contrôle et conforme aux standards sectoriels.'}`;

    if (m.includes('marge') || m.includes('va') || m.includes('valeur ajoutée') || m.includes('rentabil'))
      return `**Analyse des Marges & Partage de la Valeur Ajoutée (SCF)**\n\n- Chiffre d'Affaires Net : **${fmt(met.ca)}**\n- Valeur Ajoutée (VA) : **${fmt(met.va)}** (${pct(met.tauxVA)} du CA)\n- EBE : **${fmt(met.ebe)}** (${pct(met.margeEBE)} du CA)\n- Résultat Net : **${fmt(met.rnet)}** (${pct(met.margeNette)})\n\n📊 **Partage de la Valeur Ajoutée :**\n- Part du Personnel (63) : **${pct(diag.partPersonnel)}**\n- Part de l'État (64 + 695) : **${pct(diag.partEtat)}**\n- Part des Prêteurs (66) : **${pct(diag.partPreteurs)}**\n- Autofinancement (CAF) : **${pct(diag.partEntreprise)}**\n\n${diag.partPersonnel <= 0.65 ? '✅ Le partage de la VA est équilibré et laisse une part saine pour l\'EBE et l\'autofinancement.' : '⚠️ Le facteur travail absorbe une part prépondérante de la VA (> 65%), comprimant la marge d\'EBE.'}`;

    if (m.includes('caf') || m.includes('autofinancement') || m.includes('dette'))
      return `**Capacité d'Autofinancement (CAF) & Désendettement**\n\n- CAF brute générée : **${fmt(diag.caf)}** (${pct(diag.tauxCAF)} du CA)\n- Ratio Dettes Financières / CAF : **${diag.ratioDetteSurCAF ? diag.ratioDetteSurCAF.toFixed(2) + ' an(s)' : 'N/D'}**\n- Appréciation : **${diag.capaciteRemboursementLabel}**\n\n${diag.ratioDetteSurCAF <= 3.5 ? '✅ L\'entreprise dispose d\'une capacité de remboursement saine auprès des banques.' : '🚨 Endettement excessif face à la CAF actuelle. Priorité à l\'autofinancement et au désendettement.'}`;

    if (m.includes('banque') || m.includes('score') || m.includes('altman') || m.includes('crédit'))
      return `**Notation Bancaire & Score de Solvabilité**\n\n🏦 **Score Banque d'Algérie (Centrale des Risques) : ${solv.bancaire?.scoreBA || 14} / 20** — Profil : **${solv.bancaire?.ratingBA || 'Favorable'}**\n\n- Autonomie financière (CP / Dettes LT) : ${solv.bancaire?.detailsBA?.autonomie?.score || 4}/5 pts\n- Marge d'EBE : ${solv.bancaire?.detailsBA?.rentabilite?.score || 4}/5 pts\n- Liquidité générale : ${solv.bancaire?.detailsBA?.liquidite?.score || 4}/5 pts\n- Couverture des intérêts : ${solv.bancaire?.detailsBA?.couverture?.score || 4}/5 pts\n\n📊 **Modèle Altman Z'' (EM-Score) : ${solv.zScore ? solv.zScore.toFixed(2) : 'N/D'}** (${solv.zoneLabel || 'Zone Sûre'})\n- Risque de défaillance : **${solv.risqueDefaillance || 'Faible'}**`;

    if (m.includes('audit') || m.includes('anomalie') || m.includes('scf') || m.includes('compte'))
      return `**Audit de Conformité des Comptes SCF (Loi 07-11)**\n\n- Nombre d'irrégularités détectées : **${diag.anomaliesComptablesCount || 0}**\n- Caisse créditrice (53x) : ${diag.caisseCreditrice ? '🔴 **OUI — Anomalie matérielle critique**' : '🟢 **NON — Conforme**'}\n\n**Points de contrôle réguliers :**\n1. Vérifier l'apurement complet des comptes d'attente (471 à 478)\n2. Reclasser les fournisseurs débiteurs en 409 et clients créditeurs en 419\n3. Contrôler la concordance entre dotations 68x et amortissements 28x`;

    // Réponse générale
    return `**Synthèse Financière Exécutive BAIQ**\n\n🎯 Score Global : **${analysis.scoreGlobal} / 100 — ${analysis.niveau.emoji} ${analysis.niveau.label}**\n\n${analysis.resume}\n\n💡 Pour une réponse approfondie sur mesure, formulez votre question ou utilisez les suggestions thématiques.`;
  };

  /* ── Envoyer un message direct ── */
  const sendCustomMessage = async (msgText) => {
    if (!msgText.trim() || isLoading || !data) return;
    const userMsg = msgText.trim();
    setInputText('');
    setIsLoading(true);

    const newMessages = [...chatMessages, { role: 'user', text: userMsg, time: new Date() }];
    setChatMessages(newMessages);

    let response = null;
    if (!geminiQuotaExceeded) {
      response = await callGemini(userMsg);
      if (response && dossierKey) {
        const next = geminiCallCount + 1;
        setGeminiCallCount(next);
        localStorage.setItem(dossierKey, String(next));
      }
    }
    if (!response) {
      response = buildLocalResponse(userMsg);
      if (geminiQuotaExceeded) {
        response += `\\n\\n*— Quota d'appels IA (${MAX_GEMINI_CHAT_CALLS}/${MAX_GEMINI_CHAT_CALLS}) atteint pour ce dossier : réponse générée par le moteur local (hors ligne), sans appel à Gemini.*`;
      }
    }

    setChatMessages([...newMessages, { role: 'assistant', text: response, time: new Date() }]);
    setIsLoading(false);
  };

  const sendMessage = async () => {
    sendCustomMessage(inputText);
  };

  const exportAISynthesis = () => {
    let content = `BAIQ — BALANCE AND FINANCIAL ANALYTICS\nRAPPORT DE DIAGNOSTIC FINANCIER APPROFONDI (SCF ALGÉRIE)\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
    content += `Entité: ${data?.profil?.nomEntreprise || 'Dossier Anonyme'}\n`;
    content += `Secteur: ${sec?.label || 'Général'} (IBS: ${sec?.tauxIBS || '19%'})\n`;
    content += `Score Global: ${analysis?.scoreGlobal || 'N/A'}/100 — ${analysis?.niveau?.label || ''}\n\n`;

    content += `=== I. SYNTHÈSE EXÉCUTIVE ===\n${analysis?.resume || ''}\n\n`;

    content += `=== II. INDICATEURS DE HAUTE PRÉCISION ===\n`;
    content += `Capacité d'Autofinancement (CAF): ${fmt(diag.caf)}\n`;
    content += `Valeur Ajoutée (VA): ${fmt(analysis?.metriques?.va)} (${pct(analysis?.metriques?.tauxVA)})\n`;
    content += `Part du Personnel dans la VA: ${pct(diag.partPersonnel)}\n`;
    content += `Cash mobilisable sur BFR: ${fmt(diag.totalCashLibérable)}\n`;
    content += `Score Banque d'Algérie: ${solv.bancaire?.scoreBA || 14}/20 (${solv.bancaire?.ratingBA || 'Favorable'})\n`;
    content += `Altman Z''-Score: ${solv.zScore ? solv.zScore.toFixed(2) : 'N/D'} (${solv.zoneLabel || 'Zone Sûre'})\n`;
    if (solv.estimationPartielle) content += `⚠️ ${solv.estimationPartielleMessage}\n`;
    content += `\n`;

    content += `=== III. FORCES MAJEURES (${analysis?.forces?.length || 0}) ===\n`;
    (analysis?.forces || []).forEach((f, i) => {
      content += `${i + 1}. [${f.cat}] ${f.titre}\n   ${f.detail}\n\n`;
    });

    content += `=== IV. VULNÉRABILITÉS & RISQUES (${analysis?.faiblesses?.length || 0}) ===\n`;
    (analysis?.faiblesses || []).forEach((f, i) => {
      content += `${i + 1}. [${f.severite.toUpperCase()}] ${f.titre}\n   ${f.detail}\n\n`;
    });

    content += `=== V. PLAN D'ACTION STRATÉGIQUE CHIFFRÉ (${analysis?.recommandations?.length || 0}) ===\n`;
    (analysis?.recommandations || []).forEach((r, i) => {
      content += `${i + 1}. [${r.horizon || 'Court terme'}] ${r.action} (Impact: ${r.gainEstime || 'Structurel'})\n   ${r.detail}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diagnostic_Approfondi_BAIQ_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  /* ── Formatter le Markdown ── */
  const formatText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## '))   return <h4 key={i} style={{ fontWeight: 800, fontSize: '0.95rem', margin: '12px 0 4px', color: 'var(--text)' }}>{line.slice(3)}</h4>;
      if (line.startsWith('### '))  return <h5 key={i} style={{ fontWeight: 700, fontSize: '0.85rem', margin: '8px 0 4px', color: '#1b6e8c' }}>{line.slice(4)}</h5>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ fontWeight: 800, margin: '4px 0', fontSize: '0.85rem' }}>{line.slice(2, -2)}</p>;
      if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} style={{ marginLeft: 16, fontSize: '0.85rem', lineHeight: 1.6, color: '#334155' }}>{renderBold(line.slice(2))}</li>;
      if (line.startsWith('|') && line.includes('---')) return null;
      if (line.startsWith('|'))     return <div key={i} style={{ fontSize: '0.80rem', fontFamily: 'monospace', borderBottom: '1px solid #e2e8f0', padding: '3px 0' }}>{line}</div>;
      if (line === '')              return <br key={i} />;
      return <p key={i} style={{ margin: '3px 0', fontSize: '0.85rem', lineHeight: 1.6 }}>{renderBold(line)}</p>;
    });
  };

  const renderBold = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  };

  if (!data) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: 'linear-gradient(135deg, #1b6e8c, #7c3aed)', borderRadius: 10, padding: '4px 10px', fontSize: '0.74rem', color: '#fff', fontWeight: 700 }}>IA</span>
          Diagnostic Financier Approfondi
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Analyse multicritères de haute précision selon les normes SCF Algérie.</p>
      </div>
      <div className="card" style={{ maxWidth: 480, margin: '20px auto', textAlign: 'center', padding: '48px 32px' }}>
        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #1b6e8c, #7c3aed)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#fff' }}>smart_toy</span>
        </div>
        <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 8 }}>Importez votre balance d'abord</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>L'IA exécutera un audit complet dès le chargement de votre balance comptable.</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* ── En-tête Global ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'linear-gradient(135deg, #0f172a, #1b6e8c)', borderRadius: 10, padding: '4px 12px', fontSize: '0.74rem', color: '#fff', fontWeight: 800, letterSpacing: '0.05em' }}>DIAGNOSTIC IA</span>
            Audit & Diagnostic Financier Approfondi
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Évaluation complète : Équilibre structurel, Partage de la Valeur Ajoutée, CAF, Rating Banque d'Algérie & Potentiel Cash
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={exportAISynthesis}
            style={{
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff',
              fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 8, boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            Exporter la Synthèse (.txt)
          </button>
          {analysis && (
            <div style={{ background: `${analysis.niveau.color}15`, border: `2px solid ${analysis.niveau.color}`, borderRadius: 16, padding: '8px 18px', textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: analysis.niveau.color, lineHeight: 1 }} className="mono">{analysis.scoreGlobal}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: analysis.niveau.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>/ 100 — {analysis.niveau.label}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation des Onglets ── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-alt)', padding: 4, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}>
        {[
          { id: 'diagnostic',      label: 'Diagnostic Approfondi', icon: 'analytics'     },
          { id: 'forces',          label: `Forces (${analysis.forces.length})`, icon: 'thumb_up' },
          { id: 'faiblesses',      label: `Faiblesses (${analysis.faiblesses.length})`, icon: 'warning' },
          { id: 'recommandations', label: `Plan d'Action (${analysis.recommandations.length})`, icon: 'lightbulb' },
          { id: 'chat',            label: 'Parlez à votre Balance', icon: 'record_voice_over' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 800,
            background: activeTab === t.id ? '#1b6e8c' : 'transparent',
            color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ONGLET 1 : DIAGNOSTIC APPROFONDI & PILIERS FINANCIERS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'diagnostic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 1. Score Global & Jauges des 5 Piliers */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', color: '#8fc6d6', letterSpacing: '0.08em' }}>SANTÉ FINANCIÈRE GLOBALE</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{analysis.scoreGlobal}</span>
                    <span style={{ fontSize: '1.15rem', color: '#94a3b8', fontWeight: 700 }}>/ 100</span>
                    <span style={{ background: `${analysis.niveau.color}30`, color: '#fff', border: `1px solid ${analysis.niveau.color}`, padding: '4px 12px', borderRadius: 20, fontSize: '0.80rem', fontWeight: 800 }}>
                      {analysis.niveau.emoji} {analysis.niveau.label}
                    </span>
                  </div>
                </div>

                {/* 5 Piliers Jauges */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {[
                    { k: 'rentabilite', l: 'Rentabilité', v: analysis.scores.rentabilite },
                    { k: 'liquidite',   l: 'Liquidité',   v: analysis.scores.liquidite },
                    { k: 'structure',   l: 'Structure',   v: analysis.scores.structure },
                    { k: 'activite',    l: 'Activité BFR',v: analysis.scores.activite },
                    { k: 'productivite',l: 'Productivité',v: analysis.scores.productivite },
                  ].map(p => {
                    const c = p.v >= 70 ? '#10b981' : p.v >= 45 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={p.k} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '8px 12px', minWidth: 80 }}>
                        <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: c }}>{Math.round(p.v)}%</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>{p.l}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Résumé exécutif */}
            <div style={{ padding: '16px 24px', background: 'var(--surface-alt)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#1b6e8c', letterSpacing: '0.06em', marginBottom: 6 }}>
                📋 Synthèse Exécutive du Diagnostic
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text)' }}>
                {analysis.resume.split('\n').map((para, pIdx) => (
                  <p key={pIdx} style={{ margin: '4px 0' }}>
                    {para.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text)' }}>{part}</strong> : part)}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Grille des 4 Cartes d'Analyse Approfondie */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>

            {/* Carte 1 : Rentabilité & Partage de la Valeur Ajoutée */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#f0f8fa', borderBottom: '1px solid #b7dce6', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#1b6e8c', fontSize: 20 }}>pie_chart</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#124f66', textTransform: 'uppercase' }}>Rentabilité & Partage de la Valeur Ajoutée</span>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>Valeur Ajoutée (VA)</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{fmt(analysis.metriques.va)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>{pct(analysis.metriques.tauxVA)} du CA</div>
                  </div>
                  <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>EBE (% du CA)</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: analysis.metriques.margeEBE >= 0.10 ? '#059669' : '#dc2626', marginTop: 2 }}>
                      {fmt(analysis.metriques.ebe)} <span style={{ fontSize: '0.74rem' }}>({pct(analysis.metriques.margeEBE)})</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>Norme: {sec.benchmarks?.margeEBE?.norme || '≥10%'}</div>
                  </div>
                </div>

                {/* Décomposition du Partage de la Valeur Ajoutée */}
                <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                    Répartition de la Richesse Créée (100% de la VA) :
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#475569' }}>• Rémunération du Personnel (63) :</span>
                      <strong className="mono" style={{ color: diag.partPersonnel <= 0.65 ? '#059669' : '#dc2626' }}>{pct(diag.partPersonnel)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#475569' }}>• Contribution État & Impôts (64 + 695) :</span>
                      <strong className="mono" style={{ color: 'var(--text)' }}>{pct(diag.partEtat)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#475569' }}>• Rémunération des Prêteurs (66) :</span>
                      <strong className="mono" style={{ color: 'var(--text)' }}>{pct(diag.partPreteurs)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#475569' }}>• Autofinancement & Maintien de l'Outil (CAF) :</span>
                      <strong className="mono" style={{ color: '#1b6e8c' }}>{pct(diag.partEntreprise)}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  💡 <strong>Rentabilité des Capitaux :</strong> ROE (Rentabilité financière) : <strong>{pct(diag.roe)}</strong> · ROA (Rentabilité économique) : <strong>{pct(diag.roa)}</strong>.
                </div>
              </div>
            </div>

            {/* Carte 2 : Cycle d'Exploitation & Potentiel de Cash BFR */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 20 }}>payments</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#065f46', textTransform: 'uppercase' }}>BFR & Potentiel de Cash</span>
                </div>
                {diag.totalCashLibérable > 0 && (
                  <span style={{ background: '#059669', color: '#fff', fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: 12 }}>
                    +{fmt(diag.totalCashLibérable)} mobilisables
                  </span>
                )}
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                  <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>DSO Clients</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: analysis.metriques.dso <= 60 ? '#059669' : '#dc2626' }}>{Math.round(analysis.metriques.dso)}j</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-sub)' }}>Cible: ≤60j</div>
                  </div>
                  <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>DPO Fourn.</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: analysis.metriques.dpo >= 30 ? '#059669' : '#d97706' }}>{Math.round(analysis.metriques.dpo)}j</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-sub)' }}>Cible: 45-75j</div>
                  </div>
                  <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>Rotation Stock</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: analysis.metriques.rotS <= 90 ? '#059669' : '#dc2626' }}>{Math.round(analysis.metriques.rotS)}j</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-sub)' }}>Cible: ≤90j</div>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534', marginBottom: 4 }}>
                    💵 Décomposition du Cash Bloqué dans l'Exploitation :
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.74rem', color: '#14532d' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Retard de recouvrement clients :</span>
                      <strong className="mono">{fmt(diag.gainDSO)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• Sur-immobilisation en stocks :</span>
                      <strong className="mono">{fmt(diag.gainStock)}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  💡 <strong>BFR Total :</strong> {fmt(analysis.metriques.bfr)} ({Math.round(analysis.metriques.bfrJCA)} jours de CA). L'ajustement du DSO et du stock libérera du cash immédiatement.
                </div>
              </div>
            </div>

            {/* Carte 3 : Capacité d'Autofinancement (CAF) & Dette */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#faf5ff', borderBottom: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: 20 }}>account_balance</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#6b21a8', textTransform: 'uppercase' }}>CAF & Désendettement</span>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>CAF Brute Générée</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{fmt(diag.caf)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>{pct(diag.tauxCAF)} du CA</div>
                  </div>
                  <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>Dettes Financières LT</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{fmt(solv.bancaire?.dettesFinancieresLT || 0)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>Compte 16x</div>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>Capacité d'Extinction de la Dette</span>
                    <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 900, color: diag.ratioDetteSurCAF <= 3.5 ? '#059669' : '#dc2626' }}>
                      {diag.ratioDetteSurCAF ? `${diag.ratioDetteSurCAF.toFixed(1)} an(s)` : '0 an'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Norme bancaire : <strong>≤ 3.5 ans</strong> · Statut : <strong>{diag.capaciteRemboursementLabel}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  💡 <strong>Capacité d'emprunt résiduelle :</strong> {fmt(solv.bancaire?.capaciteEndettementMax || 0)} selon la règle prudentielle de 3.5 × EBE.
                </div>
              </div>
            </div>

            {/* Carte 4 : Rating Banque d'Algérie & Solvabilité */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 20 }}>verified_user</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase' }}>Score Banque d'Algérie & Risque</span>
                </div>
                <span style={{ background: solv.bancaire?.ratingBAColor || '#059669', color: '#fff', fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: 12 }}>
                  {solv.bancaire?.scoreBA || 14} / 20 ({solv.bancaire?.ratingBA || 'Favorable'})
                </span>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>Altman Z''-Score</div>
                    <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: solv.zoneColor || '#059669' }}>{solv.zScore ? solv.zScore.toFixed(2) : 'N/D'}</div>
                    <div style={{ fontSize: '0.58rem', color: solv.zoneColor || '#059669' }}>{solv.zoneLabel || 'Zone Sûre'}</div>
                  </div>
                  <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>Risque de Défaillance</div>
                    <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 900, color: solv.zoneColor || '#059669' }}>{solv.risqueDefaillance || 'Faible'}</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-sub)' }}>Modèle EM-Score</div>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                    Détail des 4 Piliers Banque d'Algérie :
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <div>• Autonomie : <strong>{solv.bancaire?.detailsBA?.autonomie?.score || 4}/5</strong></div>
                    <div>• Marge EBE : <strong>{solv.bancaire?.detailsBA?.rentabilite?.score || 4}/5</strong></div>
                    <div>• Liquidité : <strong>{solv.bancaire?.detailsBA?.liquidite?.score || 4}/5</strong></div>
                    <div>• Couverture : <strong>{solv.bancaire?.detailsBA?.couverture?.score || 4}/5</strong></div>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  💡 <strong>Avis Crédit :</strong> {solv.bancaire?.statutCredit || 'FAVORABLE'} pour l'obtention de lignes d'exploitation ou de crédits d'investissement.
                </div>

                {solv.estimationPartielle && (
                  <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#d97706', flexShrink: 0 }}>info</span>
                    <p style={{ fontSize: '0.72rem', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                      {solv.estimationPartielleMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ONGLET 2 : FORCES MAJEURES
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'forces' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, fontSize: '0.85rem', color: '#065f46', fontWeight: 700 }}>
            🌟 <strong>{analysis.forces.length} Atouts & Forces Identifiés</strong> selon les normes sectorielles SCF de {sec.label}.
          </div>
          {analysis.forces.map((f, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid #86efac', borderLeft: '5px solid #059669', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 20 }}>check_circle</span>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)' }}>{f.titre}</span>
                </div>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20 }}>
                  {f.cat}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', margin: 0, lineHeight: 1.6 }}>{f.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ONGLET 3 : VULNÉRABILITÉS & FAIBLESSES
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'faiblesses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px 18px', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: '0.85rem', color: '#9f1239', fontWeight: 700 }}>
            ⚠️ <strong>{analysis.faiblesses.length} Risques & Vulnérabilités Détectés</strong> nécessitant une attention immédiate.
          </div>
          {analysis.faiblesses.map((f, i) => {
            const st = SEVERITE_STYLE[f.severite] || SEVERITE_STYLE.moyen;
            return (
              <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${st.border}`, borderLeft: `5px solid ${st.color}`, borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ color: st.color, fontSize: 20 }}>{st.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)' }}>{f.titre}</span>
                  </div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, border: `1px solid ${st.border}` }}>
                    {st.label}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', margin: 0, lineHeight: 1.6 }}>{f.detail}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ONGLET 4 : PLAN D'ACTION STRATÉGIQUE CHIFFRÉ
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'recommandations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #0b3446, #1b6e8c)', color: '#fff', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>Feuille de Route DAF & Plan d'Action Stratégique</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.85, marginTop: 2 }}>{analysis.recommandations.length} chantiers prioritaires échelonnés dans le temps</div>
            </div>
            {diag.totalCashLibérable > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontWeight: 900, fontSize: '0.85rem' }}>
                Gain de Trésorerie Cible : {fmt(diag.totalCashLibérable)}
              </div>
            )}
          </div>

          {analysis.recommandations.map((rec, i) => {
            const u = URGENCE_STYLE[rec.urgence] || URGENCE_STYLE.moyenne;
            return (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `5px solid ${u.color}`, borderRadius: 12, padding: '18px 22px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.70rem', fontWeight: 900, color: u.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {rec.horizon || 'Action Prioritaire'} · {rec.categorie}
                    </span>
                    <h4 style={{ margin: '3px 0 0', fontSize: '0.95rem', fontWeight: 900, color: 'var(--text)' }}>{rec.action}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {rec.gainEstime && (
                      <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: 8, fontSize: '0.74rem', fontWeight: 900 }}>
                        Gain : {rec.gainEstime}
                      </span>
                    )}
                    <span style={{ background: u.bg, color: u.color, padding: '3px 10px', borderRadius: 8, fontSize: '0.74rem', fontWeight: 800 }}>
                      {u.label}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, margin: '0 0 14px' }}>{rec.detail}</p>

                {rec.etapes && rec.etapes.length > 0 && (
                  <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#1b6e8c' }}>checklist</span>
                      Étapes Opérationnelles d'Exécution :
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {rec.etapes.map((etape, eIdx) => (
                        <div key={eIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.80rem', color: 'var(--text)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#059669', flexShrink: 0, marginTop: 1 }}>check_circle</span>
                          <span>{etape}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ONGLET 5 : CHAT & INTERROGATION "FAITES PARLER VOTRE BALANCE"
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Bannière "Faites Parler Votre Balance" ── */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0b3446 60%, #7c3aed 100%)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#fff' }}>record_voice_over</span>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#fff' }}>Faites Parler Votre Balance 🇩🇿</div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                {isGeminiActive
                  ? '🤖 Gemini IA connectée — Posez n\'importe quelle question en langage naturel sur vos données SCF'
                  : '⚡ Mode local actif — Moteur IA embarqué · Configurez Gemini dans Paramètres pour l\'IA avancée'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: '0.70rem', fontWeight: 800, color: '#fff' }}>
                {isGeminiActive ? '✅ IA Gemini' : '🔵 IA Locale'}
              </div>
              <div style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8, padding: '4px 10px', fontSize: '0.70rem', fontWeight: 800, color: '#34d399' }}>
                🔒 100% Local
              </div>
            </div>
          </div>

          {/* Zone de chat */}
          <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 480 }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 10 }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1b6e8c, #7c3aed)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>smart_toy</span>
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? '#1b6e8c' : '#fff',
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    boxShadow: 'var(--shadow-sm)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  }}>
                    {msg.role === 'user'
                      ? <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{msg.text}</p>
                      : <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{formatText(msg.text)}</div>
                    }
                    <div style={{ fontSize: '0.65rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-sub)', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {msg.time?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div style={{ width: 32, height: 32, background: '#e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748b' }}>person</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1b6e8c, #7c3aed)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>smart_toy</span>
                  </div>
                  <div style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#1b6e8c', animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* ── Questions suggérées groupées par thème ── */}
            <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-alt)', padding: '10px 14px', maxHeight: 210, overflowY: 'auto' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                💬 Interroger la balance en 1 clic :
              </div>
              {[
                {
                  theme: '📊 Équilibre & Trésorerie', color: '#1b6e8c',
                  questions: ['Pourquoi mon BFR est-il élevé ?', 'Mon FRNG couvre-t-il mon BFR ?', 'État de ma trésorerie nette ?', 'Quel est le cash mobilisable sur mon BFR ?']
                },
                {
                  theme: '📈 Marges & Valeur Ajoutée', color: '#7c3aed',
                  questions: ['Comment est répartie ma Valeur Ajoutée ?', 'Analysez mes marges et rentabilité', 'Où est passée ma Valeur Ajoutée ?', 'Mon EBE est-il suffisant ?']
                },
                {
                  theme: '🔍 Audit Soldes & SCF', color: '#dc2626',
                  questions: ['Y a-t-il des soldes anormaux dans ma balance ?', 'Mon compte caisse est-il sain ?', 'Quels comptes 47x sont non soldés ?', 'Les dotations 68x correspondent-elles aux amortissements 28x ?']
                },
                {
                  theme: '🏦 Banque & Solvabilité', color: '#059669',
                  questions: ['Quel est mon score Banque d\'Algérie ?', 'Quelle est ma capacité d\'autofinancement (CAF) ?', 'Quel est mon score Altman Z\'\' ?', 'Combien d\'années pour rembourser ma dette ?']
                },
              ].map(group => (
                <div key={group.theme} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, color: group.color, marginBottom: 4 }}>{group.theme}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {group.questions.map(q => (
                      <button
                        key={q}
                        onClick={() => sendCustomMessage(q)}
                        style={{
                          fontSize: '0.70rem', padding: '3px 10px', borderRadius: 20,
                          border: `1px solid ${group.color}35`,
                          background: `${group.color}09`,
                          color: group.color,
                          cursor: 'pointer', fontWeight: 600,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${group.color}20`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${group.color}09`; }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            {isGeminiActive && dossierKey && (
              <div style={{ padding: '4px 12px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{
                  fontSize: '0.70rem', fontWeight: 700,
                  color: geminiQuotaExceeded ? '#dc2626' : '#64748b'
                }}>
                  {geminiQuotaExceeded
                    ? `Quota IA atteint (${MAX_GEMINI_CHAT_CALLS}/${MAX_GEMINI_CHAT_CALLS}) — réponses en mode local`
                    : `Réponses IA (Gemini) : ${geminiCallCount}/${MAX_GEMINI_CHAT_CALLS}`}
                </span>
              </div>
            )}
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKey}
                placeholder={data ? '💬 Posez n\'importe quelle question sur votre balance...' : 'Importez des données pour commencer'}
                disabled={!data || isLoading}
                style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.85rem', outline: 'none', background: data ? '#fff' : 'var(--surface-alt)', color: 'var(--text)' }}
              />
              <button
                onClick={sendMessage}
                disabled={!data || isLoading || !inputText.trim()}
                style={{ width: 42, height: 42, borderRadius: 10, border: 'none', cursor: (!data || isLoading || !inputText.trim()) ? 'not-allowed' : 'pointer', background: (!data || !inputText.trim()) ? '#e2e8f0' : 'linear-gradient(135deg, #1b6e8c, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: (!data || !inputText.trim()) ? '#94a3b8' : '#fff' }}>send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation CSS pour les points */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
