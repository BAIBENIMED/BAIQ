import { useState } from 'react';
import { exportFinancialWorkbook } from '../utils/excelExporter';
import { calculateAltmanZScore } from '../utils/solvabiliteEngine';
import { generateGeminiReport, generateLocalStructuredReport } from '../utils/aiEngine';
import { generateFullPDF } from '../utils/pdfExporter';

/* ═══════════════════════════════════════════════════════════
   BAIQ — Rapport Financier Complet avec Diagnostic IA Gemini
   ═══════════════════════════════════════════════════════════ */

const KpiRow = ({ label, value, sub, ok }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {sub && <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>{sub}</span>}
      <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: ok === true ? '#059669' : ok === false ? '#dc2626' : 'var(--text)' }}>{value}</span>
    </div>
  </div>
);

function renderInlineMarkdown(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ color: '#0f172a', fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownReportViewer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let tableBuffer = [];
  let inTable = false;

  const flushTable = (key) => {
    if (tableBuffer.length === 0) return;
    const headerRow = tableBuffer[0];
    const dataRows = tableBuffer.slice(1);

    const headers = headerRow.split('|').map(s => s.trim()).filter((s, i, a) => (i > 0 && i < a.length - 1) || (a.length <= 2 && s));

    elements.push(
      <div key={`tbl-${key}`} style={{ overflowX: 'auto', maxWidth: '100%', margin: '14px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border)' }}>
              {headers.map((h, hIdx) => {
                const isRight = hIdx > 0 && (h.includes('(DZD)') || h.includes('%') || h.includes('Montant') || h.includes('Valeur') || h.includes('Score') || h.includes('CA'));
                return (
                  <th key={hIdx} style={{ padding: '8px 12px', textAlign: isRight ? 'right' : 'left', fontWeight: 800, color: '#1e293b', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((r, rIdx) => {
              const cells = r.split('|').map(s => s.trim()).filter((s, i, a) => (i > 0 && i < a.length - 1) || (a.length <= 2 && s));
              const isEven = rIdx % 2 === 0;
              return (
                <tr key={rIdx} style={{ background: isEven ? 'transparent' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {cells.map((c, cIdx) => {
                    const isNum = c.includes('DZD') || c.includes('%') || !isNaN(Number(c.replace(/\s/g, '')));
                    return (
                      <td key={cIdx} style={{ padding: '7px 12px', textAlign: cIdx === 0 ? 'left' : (isNum ? 'right' : 'left'), color: '#334155', fontWeight: cIdx === 0 ? 600 : (isNum ? 700 : 400), fontFamily: isNum ? 'monospace' : 'inherit', whiteSpace: isNum ? 'nowrap' : 'normal' }}>
                        {renderInlineMarkdown(c)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
    inTable = false;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.includes('---')) {
        return; // separator row
      }
      tableBuffer.push(trimmed);
      inTable = true;
      return;
    } else if (inTable) {
      flushTable(i);
    }

    if (!trimmed) {
      elements.push(<div key={`br-${i}`} style={{ height: 6 }} />);
      return;
    }

    if (trimmed === '---') {
      elements.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />);
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '14px 0 6px', display: 'flex', alignItems: 'center', gap: 8, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {trimmed.slice(2)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e3a8a', margin: '16px 0 8px', borderLeft: '4px solid #2563eb', paddingLeft: 10, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {trimmed.slice(4)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '10px 0 4px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {trimmed.slice(5)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ') || trimmed.startsWith('✓ ') || trimmed.startsWith('✗ ')) {
      const isCheck = trimmed.startsWith('✓');
      const isCross = trimmed.startsWith('✗');
      elements.push(
        <div key={`li-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '4px 0', fontSize: '0.83rem', color: '#334155', paddingLeft: 8, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.65 }}>
          <span style={{ color: isCheck ? '#059669' : isCross ? '#dc2626' : '#2563eb', fontWeight: 800, flexShrink: 0 }}>
            {isCheck ? '✓' : isCross ? '✗' : '•'}
          </span>
          <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {renderInlineMarkdown(trimmed.replace(/^[-*•✓✗]\s*/, ''))}
          </span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={`p-${i}`} style={{ margin: '5px 0', fontSize: '0.84rem', color: '#334155', lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (inTable) flushTable(lines.length);

  return <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%', boxSizing: 'border-box' }}>{elements}</div>;
}

export function ReportsView({ data, fmt: propFmt, formatCurrency, geminiKey = '' }) {
  const fmt = typeof propFmt === 'function' ? propFmt : typeof formatCurrency === 'function' ? formatCurrency : ((v) => {
    if (v === null || v === undefined || isNaN(v)) return '0 DZD';
    const num = Math.round(Number(v));
    const sign = num < 0 ? '-' : '';
    return `${sign}${Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DZD`;
  });
  const [reportType, setReportType] = useState('audit_diagnostic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [geminiError, setGeminiError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [localKey, setLocalKey] = useState(() => localStorage.getItem('finanalyze_gemini_key') || '');

  const handleGenerateGeminiReport = () => setShowConfirmModal(true);

  const handleExportPDF = async () => {
    if (!data) return;
    setIsPdfGenerating(true);
    try {
      await generateFullPDF(data);
    } catch (e) {
      console.error('Erreur export PDF:', e);
      alert('Erreur lors de la génération du PDF : ' + (e?.message || 'Erreur inconnue'));
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Identifiant unique du dossier / balance courante (anonyme)
  const dossierId = data ? `dossier_${data?.rows?.length || 0}_${Math.round(data?.sig?.chiffreAffaires || 0)}_${data?.profil?.secteurId || 'scf'}` : 'default';
  const reportSlotKey = `${dossierId}_${reportType}`;

  // Rapports sauvegardés par dossier et par type
  const [savedReports, setSavedReports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('baiq_saved_ai_reports') || '{}');
    } catch {
      return {};
    }
  });

  const currentReportEntry = savedReports[reportSlotKey] || null;
  const localReportText    = data ? generateLocalStructuredReport(data, reportType) : '';
  const displayedReportText = currentReportEntry?.text || localReportText;
  const hasUsedQuota       = Boolean(currentReportEntry);

  const effectiveKey = geminiKey || localKey;

  // Lancement de la génération après confirmation
  const executeGeneration = async () => {
    setShowConfirmModal(false);
    if (!effectiveKey) {
      setGeminiError("Veuillez saisir votre clé API Google Gemini pour lancer la génération.");
      return;
    }
    setIsGenerating(true);
    setGeminiError('');
    try {
      const result = await generateGeminiReport(data, reportType, effectiveKey);
      const updated = {
        ...savedReports,
        [reportSlotKey]: {
          text: result,
          type: reportType,
          date: new Date().toISOString(),
          isGemini: true
        }
      };
      setSavedReports(updated);
      localStorage.setItem('baiq_saved_ai_reports', JSON.stringify(updated));
    } catch (err) {
      setGeminiError(err?.message || "Erreur lors de la génération du rapport avec Gemini.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Réinitialiser le rapport généré pour ce type
  const handleResetQuota = () => {
    const updated = { ...savedReports };
    delete updated[reportSlotKey];
    setSavedReports(updated);
    localStorage.setItem('baiq_saved_ai_reports', JSON.stringify(updated));
  };

  const handleCopyReport = () => {
    if (!displayedReportText) return;
    navigator.clipboard.writeText(displayedReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /* ── Garde — données manquantes ── */
  if (!data) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Rapport Financier Complet</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Analyse détaillée avec diagnostic, forces &amp; faiblesses (SCF Algérie).</p>
      </div>
      <div className="card" style={{ maxWidth: 480, margin: '20px auto', textAlign: 'center', padding: '48px 32px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--text-sub)', display: 'block', marginBottom: 16 }}>description</span>
        <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 8 }}>Aucune donnée disponible</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Importez une balance comptable pour générer le rapport complet.</p>
      </div>
    </div>
  );

  const { bilan, sig, ratios, rows, profil } = data;
  const r = ratios || {};
  const s = sig || {};
  const b = bilan || {};

  /* ── Helpers ── */
  const fmtPct = (v) => `${(v >= 0 ? '+' : '')}${(v * 100).toFixed(1)} %`;
  const fmtRatio = (v, dec = 2) => (isFinite(v) ? v.toFixed(dec) : '—');
  const fmtDays = (v) => `${Math.round(v || 0)} j`;
  const safeDiv = (a, b) => (b && b !== 0 ? a / b : 0);

  /* ── Calculs dérivés ── */
  const margeEBE     = safeDiv(s.ebe, s.chiffreAffaires);
  const margeExploit = safeDiv(s.resultatExploitation, s.chiffreAffaires);
  const margeNette   = r.rentabiliteNette || safeDiv(s.resultatNet, s.chiffreAffaires);
  const tauxVA       = safeDiv(s.valeurAjoutee, s.chiffreAffaires);
  const tauxPersonnel= safeDiv(s.chargesPersonnel, s.valeurAjoutee);
  const couvertureCharge = safeDiv(s.ebe, s.chargesFinancieres);
  const bfrJCA       = r.bfrJoursCA || 0;
  const dso          = r.delaiRecouvrement || 0;
  const dpo          = r.delaiFournisseurs || 0;
  const rotStock     = r.rotationStocks || 0;
  const liqGen       = r.liquiditeGenerale || 0;
  const autFinanc    = r.autonomieFinanciere || 0;

  // Calcul du Score Altman Z'' et Rating de Solvabilité
  const solv = calculateAltmanZScore(bilan || {}, sig || {}, rows || []);

  /* ── Moteur de diagnostic Forces / Faiblesses ── */
  const analyse = [];

  // Trésorerie nette
  if ((b.tn || 0) > 0) {
    analyse.push({ type: 'force', cat: 'Trésorerie', icon: 'account_balance_wallet',
      titre: 'Trésorerie nette positive',
      detail: `La trésorerie nette est de ${fmt(b.tn)}, indiquant une position de liquidité saine. L'entreprise dispose de réserves disponibles pour faire face à ses engagements immédiats.` });
  } else {
    analyse.push({ type: 'faiblesse', cat: 'Trésorerie', icon: 'money_off',
      titre: 'Trésorerie nette négative',
      detail: `Trésorerie nette de ${fmt(b.tn)}. L'entreprise est en tension de liquidité. Des lignes de crédit court terme semblent utilisées pour financer l'exploitation.` });
  }

  // FRNG
  if ((b.frng || 0) > 0) {
    analyse.push({ type: 'force', cat: 'Équilibre financier', icon: 'balance',
      titre: 'FRNG positif — Équilibre long terme assuré',
      detail: `Le Fonds de Roulement Net Global s'élève à ${fmt(b.frng)}. Les ressources stables financent intégralement les emplois stables et génèrent un excédent disponible pour l'exploitation.` });
  } else {
    analyse.push({ type: 'faiblesse', cat: 'Équilibre financier', icon: 'warning',
      titre: 'FRNG négatif — Déséquilibre structurel',
      detail: `Le FRNG est déficitaire : ${fmt(b.frng)}. Des emplois stables sont financés par des ressources à court terme, ce qui fragilise l'équilibre financier de l'entité.` });
  }

  // BFR
  if ((b.bfr || 0) >= 0) {
    analyse.push({ type: 'neutre', cat: 'BFR', icon: 'loop',
      titre: 'BFR positif — Besoin de financement',
      detail: `Le Besoin en Fonds de Roulement est de ${fmt(b.bfr)} (${fmtDays(bfrJCA)} de CA). Ce besoin est structurel à l'activité : il doit être couvert par le FRNG.` });
  } else {
    analyse.push({ type: 'force', cat: 'BFR', icon: 'trending_down',
      titre: 'BFR négatif — Ressource d\'exploitation',
      detail: `Un BFR négatif de ${fmt(b.bfr)} signifie que les fournisseurs financent l'activité : l'entreprise encaisse avant de payer. Situation favorable typique du commerce ou grande distribution.` });
  }

  // Rentabilité
  if (margeNette > 0.05) {
    analyse.push({ type: 'force', cat: 'Rentabilité', icon: 'trending_up',
      titre: 'Rentabilité nette solide',
      detail: `La marge nette est de ${fmtPct(margeNette)} du CA (${fmt(s.resultatNet)}). Cette rentabilité témoigne d'une bonne maîtrise des coûts et d'une activité commerciale profitable.` });
  } else if (margeNette > 0) {
    analyse.push({ type: 'neutre', cat: 'Rentabilité', icon: 'show_chart',
      titre: 'Rentabilité nette faible mais positive',
      detail: `La marge nette est de ${fmtPct(margeNette)} du CA. L'entreprise est bénéficiaire mais la marge reste fragile. Un effort sur les charges ou une hausse du CA est conseillé.` });
  } else {
    analyse.push({ type: 'faiblesse', cat: 'Rentabilité', icon: 'trending_down',
      titre: 'Résultat net déficitaire',
      detail: `L'exercice se solde par une perte de ${fmt(s.resultatNet)}. L'entreprise détruit de la valeur. Une restructuration des charges ou de l'activité est nécessaire.` });
  }

  // EBE
  if (margeEBE > 0.10) {
    analyse.push({ type: 'force', cat: 'EBE', icon: 'query_stats',
      titre: 'Excédent Brut d\'Exploitation satisfaisant',
      detail: `La marge EBE est de ${fmtPct(margeEBE)} du CA (${fmt(s.ebe)}). L'EBE permet de couvrir les amortissements, les charges financières et de dégager un résultat positif.` });
  } else if (margeEBE > 0) {
    analyse.push({ type: 'neutre', cat: 'EBE', icon: 'query_stats',
      titre: 'EBE positif mais insuffisant',
      detail: `Marge EBE de ${fmtPct(margeEBE)} du CA. La capacité d'autofinancement est limitée. Il convient d'analyser la structure des charges opérationnelles.` });
  } else {
    analyse.push({ type: 'faiblesse', cat: 'EBE', icon: 'warning',
      titre: 'EBE négatif — Activité non rentable avant financement',
      detail: `EBE négatif de ${fmt(s.ebe)}. L'activité courante ne génère pas assez pour couvrir ses propres charges d'exploitation. Situation critique nécessitant un plan de redressement.` });
  }

  // Liquidité générale
  if (liqGen >= 1.5) {
    analyse.push({ type: 'force', cat: 'Liquidité', icon: 'water_drop',
      titre: 'Liquidité générale excellente',
      detail: `Ratio de ${fmtRatio(liqGen)}. L'actif circulant couvre très largement le passif à court terme. Solvabilité à court terme assurée avec une marge confortable.` });
  } else if (liqGen >= 1) {
    analyse.push({ type: 'neutre', cat: 'Liquidité', icon: 'water_drop',
      titre: 'Liquidité générale satisfaisante',
      detail: `Ratio de ${fmtRatio(liqGen)}. L'actif circulant couvre le passif à court terme, mais la marge est limitée. Surveiller l'évolution du BFR.` });
  } else {
    analyse.push({ type: 'faiblesse', cat: 'Liquidité', icon: 'warning',
      titre: 'Risque de liquidité à court terme',
      detail: `Ratio de ${fmtRatio(liqGen)} (< 1). L'actif circulant est insuffisant pour couvrir le passif à court terme. Risque d'insolvabilité si un créancier exige un remboursement immédiat.` });
  }

  // Autonomie financière
  if (autFinanc >= 0.5) {
    analyse.push({ type: 'force', cat: 'Structure financière', icon: 'shield',
      titre: 'Forte autonomie financière',
      detail: `Autonomie financière de ${fmtPct(autFinanc)} du total bilan. L'entreprise se finance majoritairement par ses fonds propres, ce qui lui donne une indépendance vis-à-vis des créanciers.` });
  } else if (autFinanc >= 0.3) {
    analyse.push({ type: 'neutre', cat: 'Structure financière', icon: 'shield',
      titre: 'Autonomie financière acceptable',
      detail: `Autonomie de ${fmtPct(autFinanc)}. La structure de financement est équilibrée mais l'endettement représente une part significative du bilan.` });
  } else {
    analyse.push({ type: 'faiblesse', cat: 'Structure financière', icon: 'shield',
      titre: 'Dépendance excessive aux dettes',
      detail: `Autonomie financière de seulement ${fmtPct(autFinanc)}. L'entreprise est fortement dépendante des créanciers. En cas de resserrement du crédit, la situation peut devenir critique.` });
  }

  // DSO — Créances clients
  if (dso > 0 && dso <= 45) {
    analyse.push({ type: 'force', cat: 'Créances clients', icon: 'payments',
      titre: 'Recouvrement clients rapide',
      detail: `DSO de ${fmtDays(dso)} : les clients paient rapidement. Le risque de créances irrécouvrables est limité et le cycle de trésorerie est favorable.` });
  } else if (dso > 45 && dso <= 90) {
    analyse.push({ type: 'neutre', cat: 'Créances clients', icon: 'payments',
      titre: 'DSO à surveiller',
      detail: `Délai de recouvrement de ${fmtDays(dso)}. Le délai client est dans la moyenne, mais une relance proactive permettrait d'améliorer la trésorerie.` });
  } else if (dso > 90) {
    analyse.push({ type: 'faiblesse', cat: 'Créances clients', icon: 'warning',
      titre: 'Délai de recouvrement clients élevé',
      detail: `DSO de ${fmtDays(dso)} : les créances clients restent longtemps en portefeuille. Risque accru d'impayés et de dégradation de la trésorerie. Renforcer la politique de relance.` });
  }

  // DPO — Fournisseurs
  if (dpo >= 30 && dpo <= 90) {
    analyse.push({ type: 'force', cat: 'Dettes fournisseurs', icon: 'receipt_long',
      titre: 'Délai fournisseurs équilibré',
      detail: `DPO de ${fmtDays(dpo)} : les délais de paiement fournisseurs sont dans la norme SCF (30-90j). L'entreprise bénéficie d'un crédit fournisseur sain.` });
  } else if (dpo < 30 && dpo > 0) {
    analyse.push({ type: 'neutre', cat: 'Dettes fournisseurs', icon: 'receipt_long',
      titre: 'Paiement fournisseurs trop rapide',
      detail: `DPO de seulement ${fmtDays(dpo)} : l'entreprise paie ses fournisseurs très tôt. Négocier des délais plus longs permettrait de réduire le BFR.` });
  } else if (dpo > 90) {
    analyse.push({ type: 'faiblesse', cat: 'Dettes fournisseurs', icon: 'warning',
      titre: 'Délai fournisseurs excessif',
      detail: `DPO de ${fmtDays(dpo)} : les fournisseurs sont payés très tardivement. Risque de tensions commerciales, pénalités de retard ou rupture d'approvisionnement.` });
  }

  // Rotation des stocks
  if (rotStock > 0 && rotStock <= 60) {
    analyse.push({ type: 'force', cat: 'Stocks', icon: 'warehouse',
      titre: 'Bonne rotation des stocks',
      detail: `Délai d'écoulement de ${fmtDays(rotStock)} : les stocks se renouvellent rapidement. Risque d'obsolescence faible et immobilisations financières limitées.` });
  } else if (rotStock > 60 && rotStock <= 120) {
    analyse.push({ type: 'neutre', cat: 'Stocks', icon: 'warehouse',
      titre: 'Rotation des stocks à optimiser',
      detail: `Délai de ${fmtDays(rotStock)} : le stock s'écoule lentement. Des sur-stockages peuvent exister. Une politique de réapprovisionnement plus précise est recommandée.` });
  } else if (rotStock > 120) {
    analyse.push({ type: 'faiblesse', cat: 'Stocks', icon: 'warning',
      titre: 'Rotation des stocks très lente',
      detail: `Délai de ${fmtDays(rotStock)} : les stocks sont immobilisés trop longtemps. Risque d'obsolescence, coût de stockage élevé et impact négatif sur le BFR.` });
  }

  // Valeur ajoutée
  if (tauxVA >= 0.25) {
    analyse.push({ type: 'force', cat: 'Création de valeur', icon: 'add_circle',
      titre: 'Taux de valeur ajoutée élevé',
      detail: `Taux de VA de ${fmtPct(tauxVA)} du CA (${fmt(s.valeurAjoutee)}). L'entreprise crée une part importante de richesse nette par rapport à ses approvisionnements externes.` });
  } else {
    analyse.push({ type: 'neutre', cat: 'Création de valeur', icon: 'add_circle',
      titre: 'Taux de valeur ajoutée modéré',
      detail: `Taux de VA de ${fmtPct(tauxVA)} du CA. La valeur ajoutée dépend fortement des achats externes. Veiller à la maîtrise des coûts d'approvisionnement.` });
  }

  // Charges de personnel
  if (tauxPersonnel <= 0.60) {
    analyse.push({ type: 'force', cat: 'Productivité RH', icon: 'badge',
      titre: 'Charges de personnel maîtrisées',
      detail: `Les charges de personnel représentent ${fmtPct(tauxPersonnel)} de la VA. La productivité du travail est bonne et laisse une marge suffisante pour l'EBE.` });
  } else if (tauxPersonnel <= 0.75) {
    analyse.push({ type: 'neutre', cat: 'Productivité RH', icon: 'badge',
      titre: 'Poids des charges de personnel important',
      detail: `Les salaires absorbent ${fmtPct(tauxPersonnel)} de la VA. Ce ratio est correct mais laisse peu de marge de manœuvre en cas de baisse d'activité.` });
  } else {
    analyse.push({ type: 'faiblesse', cat: 'Productivité RH', icon: 'warning',
      titre: 'Charges de personnel trop lourdes',
      detail: `Les charges de personnel absorbent ${fmtPct(tauxPersonnel)} de la VA (> 75%). L'EBE est comprimé, ce qui limite fortement la capacité d'autofinancement de l'entreprise.` });
  }

  // Couverture charges financières
  if (s.chargesFinancieres > 0) {
    if (couvertureCharge >= 3) {
      analyse.push({ type: 'force', cat: 'Risque financier', icon: 'savings',
        titre: 'Couverture des charges financières confortable',
        detail: `L'EBE couvre ${couvertureCharge.toFixed(1)}x les charges financières. L'entreprise peut facilement honorer ses intérêts d'emprunt.` });
    } else {
      analyse.push({ type: 'faiblesse', cat: 'Risque financier', icon: 'warning',
        titre: 'Poids excessif des charges financières',
        detail: `L'EBE ne couvre que ${couvertureCharge.toFixed(1)}x les charges financières (< 3x). Le risque de défaut en cas de baisse d'activité est accru.` });
    }
  }

  const nbForces     = analyse.filter(a => a.type === 'force').length;
  const nbFaiblesses = analyse.filter(a => a.type === 'faiblesse').length;
  const nbNeutre     = analyse.filter(a => a.type === 'neutre').length;

  const score = Math.max(0, Math.min(100, Math.round(50 + (nbForces * 8) - (nbFaiblesses * 10))));
  const scoreColor = score >= 70 ? '#059669' : score >= 45 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 70 ? 'Situation financière solide' : score >= 45 ? 'Situation financière sous surveillance' : 'Situation financière fragile — Action requise';

  /* ── Export Multi-Feuilles Excel via excelExporter ── */
  const handleExportExcel = () => {
    exportFinancialWorkbook(data, `Rapport_Financier_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* ── Couleurs par type ── */
  const typeStyle = {
    force:    { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: 'check_circle', label: 'FORCE' },
    faiblesse:{ bg: '#fff1f2', border: '#fca5a5', color: '#be123c', icon: 'cancel',       label: 'FAIBLESSE' },
    neutre:   { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: 'info',         label: 'NEUTRE' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 48 }} id="rapport-financier">

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Rapport Financier Complet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Diagnostic complet avec analyse des forces, faiblesses, solvabilité &amp; recommandations — référentiel SCF Algérie</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.2)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>table_view</span>
            Export Excel (.xlsx)
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isPdfGenerating || !data}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              background: isPdfGenerating ? '#94a3b8' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px',
              fontWeight: 900, cursor: isPdfGenerating ? 'wait' : 'pointer',
              boxShadow: isPdfGenerating ? 'none' : '0 4px 14px rgba(220,38,38,0.35)',
              fontSize: '0.88rem', transition: 'all 0.2s'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {isPdfGenerating ? 'hourglass_empty' : 'picture_as_pdf'}
            </span>
            {isPdfGenerating ? 'Génération en cours…' : '📄 Exporter PDF Structuré (7 sections)'}
          </button>
        </div>
      </div>

      {/* ── Bannière PDF ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #b91c1c 100%)',
        borderRadius: 14, padding: '18px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        boxShadow: '0 8px 24px rgba(185,28,28,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#fff' }}>picture_as_pdf</span>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#fff' }}>Export PDF Professionnel — Rapport Annuel Complet (7 sections)</div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
              Page de garde · Bilan fonctionnel · SIG/TCR · Ratios · Comparatif N-1 · Diagnostic Forces/Risques · Audit SCF
            </div>
          </div>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isPdfGenerating || !data}
          style={{
            padding: '10px 22px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.35)',
            background: isPdfGenerating ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            color: '#fff', fontWeight: 900, fontSize: '0.88rem', cursor: isPdfGenerating ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(4px)',
            transition: 'all 0.2s', flexShrink: 0
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = isPdfGenerating ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {isPdfGenerating ? 'hourglass_empty' : 'download'}
          </span>
          {isPdfGenerating ? 'Génération PDF…' : 'Télécharger le PDF'}
        </button>
      </div>


      {/* ── SECTION IA GOOGLE GEMINI : GÉNÉRATION DE RAPPORTS & DIAGNOSTICS ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(124, 58, 237, 0.3)', boxShadow: '0 8px 30px rgba(124, 58, 237, 0.08)' }}>
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#c4b5fd' }}>auto_awesome</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>Générateur de Rapports &amp; Diagnostics avec Google Gemini IA</h3>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(196, 181, 253, 0.25)', color: '#e9d5ff', border: '1px solid rgba(196, 181, 253, 0.4)' }}>
                  IA Générative SCF
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#c7d2fe' }}>
                Générez des analyses stratégiques, plans d'action chiffrés et diagnostics bancaires complets en 1 clic.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Badge Quota */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 6,
              background: hasUsedQuota ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${hasUsedQuota ? '#d97706' : '#059669'}`,
              fontSize: '0.72rem',
              fontWeight: 800,
              color: hasUsedQuota ? '#fde68a' : '#6ee7b7'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{hasUsedQuota ? 'lock' : 'hourglass_bottom'}</span>
              <span>{hasUsedQuota ? 'Quota utilisé (1/1)' : 'Quota : 1 rapport dispo'}</span>
            </div>

            {displayedReportText && (
              <>
                <button
                  onClick={handleCopyReport}
                  className="btn"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
                  Imprimer
                </button>
              </>
            )}

            {currentReportEntry?.isGemini ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="btn"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                  title="Régénérer une nouvelle version avec Gemini"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f59e0b' }}>refresh</span>
                  Régénérer Gemini
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isGenerating}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  opacity: isGenerating ? 0.7 : 1
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isGenerating ? 'hourglass_top' : 'auto_awesome'}</span>
                {isGenerating ? 'Génération...' : 'Augmenter avec Gemini'}
              </button>
            )}
          </div>
        </div>

        {/* ── MODAL D'AVERTISSEMENT ET DE CONFIRMATION DU QUOTA ── */}
        {showConfirmModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}>
            <div style={{
              width: '100%',
              maxWidth: 520,
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245, 158, 11, 0.25)', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 20 }}>warning</span>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>Confirmation de Génération IA</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#cbd5e1' }}>Limite stricte : 1 rapport par dossier importé</p>
                </div>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '14px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 22, marginTop: 1 }}>info</span>
                  <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.55 }}>
                    <strong>Attention :</strong> Cette action va consommer <strong>1 appel IA</strong> pour cette balance comptable.
                    <br />
                    Une fois généré, le rapport restera sauvegardé et consultable sans consommer d'appel supplémentaire.
                  </div>
                </div>

                <div style={{ padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Type de rapport :</span>
                    <strong style={{ color: 'var(--primary)' }}>
                      {reportType === 'audit_diagnostic' ? '📊 Audit & Diagnostic Complet' :
                       reportType === 'recommendations_plan' ? '🎯 Plan d\'Action Opérationnel' : '🏦 Note d\'Analyse Bancaire'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Comptes analysés :</span>
                    <strong>{data?.rows?.length || 0} comptes</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Chiffre d'Affaires :</span>
                    <strong className="mono">{fmt(data?.sig?.chiffreAffaires || 0)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 24px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="btn"
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={executeGeneration}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}
                >
                  Confirmer &amp; Générer (Consommer 1 crédit)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barre de sélection du type de rapport */}
        <div style={{ padding: '10px 24px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'audit_diagnostic', label: '📊 Audit & Diagnostic Complet', desc: 'Synthèse managériale, équilibre, rentabilité & risques' },
              { id: 'recommendations_plan', label: '🎯 Plan d\'Action & Recommandations', desc: 'Actions chiffrées 0-30j, 1-3m, 3-12m & KPIs' },
              { id: 'banque_credit', label: '🏦 Note d\'Analyse Bancaire', desc: 'Dossier crédit, solvabilité, garanties & avis comité' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: `1px solid ${reportType === tab.id ? '#6366f1' : 'var(--border)'}`,
                  background: reportType === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface)',
                  color: reportType === tab.id ? '#6366f1' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={tab.desc}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Saisie rapide clé Gemini si absente */}
          {!effectiveKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 800 }}>⚠️ Clé Gemini requise :</span>
              <input
                type="password"
                placeholder="Coller clé AI Studio..."
                value={localKey}
                onChange={e => {
                  setLocalKey(e.target.value);
                  localStorage.setItem('finanalyze_gemini_key', e.target.value);
                }}
                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.74rem', width: 170, outline: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Message d'erreur éventuel */}
        {geminiError && (
          <div style={{ padding: '12px 24px', background: '#fee2e2', borderBottom: '1px solid #fca5a5', color: '#b91c1c', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            <span>{geminiError}</span>
          </div>
        )}

        {/* Contenu du rapport généré ou état d'attente */}
        <div style={{ padding: '24px' }}>
          {isGenerating ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <h4 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)', margin: '0 0 6px' }}>
                Gemini analyse votre balance et vos états financiers...
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                Diagnostic approfondi de l'équilibre financier (FRNG/BFR/TN), calcul des ratios SCF et formulation des recommandations stratégiques.
              </p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : displayedReportText ? (
            <div style={{
              background: 'var(--surface-alt)',
              borderRadius: 12,
              padding: '24px 28px',
              border: '1px solid var(--border)',
              lineHeight: 1.75,
              fontSize: '0.86rem',
              color: 'var(--text)',
              fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}>
              <MarkdownReportViewer content={displayedReportText} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--surface-alt)', borderRadius: 10, border: '1px dashed var(--border)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#818cf8', display: 'block', marginBottom: 10 }}>psychology</span>
              <h4 style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text)', margin: '0 0 4px' }}>
                Prêt pour l'analyse financière augmentée par IA
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 540, margin: '0 auto 16px' }}>
                Sélectionnez un type de rapport ci-dessus pour afficher le diagnostic complet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Score global & Solvabilité Altman ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Score de santé */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', background: `${scoreColor}10`, borderBottom: `3px solid ${scoreColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: scoreColor, marginBottom: 4 }}>Score de Santé Financière</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }} className="mono">{score} / 100</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{scoreLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Forces',    count: nbForces,    color: '#059669', bg: '#f0fdf4' },
                { label: 'Neutres',   count: nbNeutre,    color: '#d97706', bg: '#fffbeb' },
                { label: 'Faiblesses',count: nbFaiblesses,color: '#dc2626', bg: '#fff1f2' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color }} className="mono">{count}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color, textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '10px 20px', background: 'var(--surface-alt)' }}>
            <div style={{ height: 8, borderRadius: 4, background: '#fee2e2', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${score}%`, background: scoreColor, borderRadius: 4, transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>

        {/* Score Altman Z'' & Rating Bancaire */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', background: solv.zoneBg, borderBottom: `3px solid ${solv.zoneColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: solv.zoneColor, marginBottom: 4 }}>Rating Crédit &amp; Altman Z''</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: solv.zoneColor, lineHeight: 1 }} className="mono">Rating : {solv.rating}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>Score Z'' : {solv.zScore.toFixed(2)} ({solv.zoneLabel.split('—')[0]})</div>
            </div>
            <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 10, border: `1px solid ${solv.zoneBorder}`, textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Risque de Défaillance</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: solv.zoneColor }}>{solv.risqueDefaillance}</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>Statut Crédit : <strong>{solv.bancaire.statutCredit}</strong></div>
            </div>
          </div>
          <div style={{ padding: '10px 20px', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' }}>
            <span>Désendettement : <strong>{solv.bancaire.ratioDetteSurEBE < 90 ? `${solv.bancaire.ratioDetteSurEBE.toFixed(1)} ans d'EBE` : 'N/A'}</strong></span>
            <span>Capacité emprunt : <strong style={{ color: '#2563eb' }}>{fmt(solv.bancaire.capaciteEndettementMax)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Section 1 : Équilibre Fonctionnel ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>account_tree</span>
          <h3 style={{ fontWeight: 800, fontSize: '0.95rem' }}>1. Équilibre Fonctionnel (SCF)</h3>
        </div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Emplois Stables',      val: b.emploisStables,    sub: 'Actif Non Courant', color: '#2563eb' },
            { label: 'Ressources Stables',   val: b.ressourcesStables, sub: 'Capitaux Permanents', color: '#059669' },
            { label: 'FRNG',                 val: b.frng,              sub: 'Ressources − Emplois', color: (b.frng||0)>=0 ? '#059669':'#dc2626', bold: true },
            { label: 'Actif Circulant',      val: b.actifCirculant,    sub: 'Stocks + Créances', color: '#2563eb' },
            { label: 'Passif Circulant',     val: b.passifCirculant,   sub: 'Dettes CT', color: '#d97706' },
            { label: 'BFR',                  val: b.bfr,               sub: 'Actif Circ. − Passif Circ.', color: (b.bfr||0)>=0 ? '#d97706':'#059669', bold: true },
            { label: 'Trésorerie Active',    val: b.tresorerieActive,  sub: 'Liquidités', color: '#2563eb' },
            { label: 'Trésorerie Passive',   val: b.tresoreriePassive, sub: 'Concours bancaires', color: '#dc2626' },
            { label: 'Trésorerie Nette',     val: b.tn,                sub: 'FRNG − BFR', color: (b.tn||0)>=0 ? '#059669':'#dc2626', bold: true },
          ].map(({ label, val, sub, color, bold }) => (
            <div key={label} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>{label}</div>
              <div className="mono" style={{ fontSize: bold ? '1.05rem' : '0.95rem', fontWeight: bold ? 900 : 700, color }}>{fmt(val)}</div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-sub)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2 : Soldes Intermédiaires de Gestion ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 20 }}>analytics</span>
          <h3 style={{ fontWeight: 800, fontSize: '0.95rem' }}>2. Soldes Intermédiaires de Gestion (TCR / SCF)</h3>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: "Chiffre d'Affaires (CA)", value: fmt(s.chiffreAffaires), indent: 0, bold: true, color: '#2563eb' },
            { label: 'Production de l\'exercice', value: fmt(s.productionExercice), indent: 1, sub: '70+72+73+74' },
            { label: '− Consommations de l\'exercice', value: fmt(s.consommationExercice), indent: 1, sub: '60+61+62', negative: true },
            { label: '= Valeur Ajoutée (VA)', value: fmt(s.valeurAjoutee), indent: 0, bold: true, highlight: true, pct: fmtPct(tauxVA) + ' du CA' },
            { label: '− Charges de personnel (63)', value: fmt(s.chargesPersonnel), indent: 1, negative: true, sub: `${(tauxPersonnel*100).toFixed(1)}% VA` },
            { label: '− Impôts & taxes (64)', value: fmt(s.impotsTaxes), indent: 1, negative: true },
            { label: '= EBE', value: fmt(s.ebe), indent: 0, bold: true, highlight: true, pct: fmtPct(margeEBE) + ' du CA' },
            { label: 'Autres produits opérationnels (75)', value: fmt(s.autresProduitsOp), indent: 1 },
            { label: '− Autres charges opérationnelles (65)', value: fmt(s.autresChargesOp), indent: 1, negative: true },
            { label: '− Dotations amort. & provisions (68)', value: fmt(s.dotationsExploitation), indent: 1, negative: true },
            { label: '+ Reprises sur provisions (78)', value: fmt(s.reprisesExploitation), indent: 1 },
            { label: '= Résultat d\'exploitation', value: fmt(s.resultatExploitation), indent: 0, bold: true, highlight: true, pct: fmtPct(margeExploit) + ' du CA' },
            { label: 'Produits financiers (76)', value: fmt(s.produitsFinanciers), indent: 1 },
            { label: '− Charges financières (66)', value: fmt(s.chargesFinancieres), indent: 1, negative: true },
            { label: '= Résultat Financier', value: fmt(s.resultatFinancier), indent: 0, bold: true },
            { label: '= RCAI', value: fmt(s.rcai), indent: 0, bold: true },
            { label: '− Impôts sur bénéfices / IBS (69)', value: fmt(s.impotsBenefices), indent: 1, negative: true },
            { label: '= Résultat Net de l\'exercice', value: fmt(s.resultatNet), indent: 0, bold: true, highlight: true, pct: fmtPct(margeNette) + ' du CA', bigColor: (s.resultatNet||0) >= 0 ? '#059669' : '#dc2626' },
          ].map(({ label, value, indent, bold, highlight, pct, negative, sub, color, bigColor }, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: highlight ? '10px 12px' : '7px 12px',
              paddingLeft: (indent * 20) + 12,
              background: highlight ? 'var(--surface-alt)' : 'transparent',
              borderRadius: highlight ? 8 : 0,
              fontWeight: bold ? 700 : 400,
              borderBottom: '1px solid #f8fafc'
            }}>
              <span style={{ fontSize: '0.82rem', color: color || 'var(--text)' }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {sub && <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{sub}</span>}
                {pct && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-dk)', background: 'var(--primary-lt)', padding: '2px 8px', borderRadius: 6 }}>{pct}</span>}
                <span className="mono" style={{ fontSize: bold ? '0.92rem' : '0.82rem', fontWeight: bold ? 800 : 500, color: bigColor || (negative ? '#dc2626' : 'var(--text)') }}>
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3 : Ratios Financiers ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 20 }}>query_stats</span>
          <h3 style={{ fontWeight: 800, fontSize: '0.95rem' }}>3. Ratios Financiers &amp; Délais d'Exploitation</h3>
        </div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Délais &amp; Cycles d'Exploitation</div>
            <KpiRow label="DSO — Délai Recouvrement Clients" value={fmtDays(dso)} sub={r.tauxRotationCreances ? `${r.tauxRotationCreances.toFixed(1)}x/an` : ''} ok={dso <= 60} />
            <KpiRow label="DPO — Délai Paiement Fournisseurs" value={fmtDays(dpo)} sub={fmt(r.dettesFournisseurs)} ok={dpo >= 30 && dpo <= 90} />
            <KpiRow label="Rotation des Stocks" value={fmtDays(rotStock)} sub={r.tauxRotationStocks ? `${r.tauxRotationStocks.toFixed(1)}x/an` : ''} ok={rotStock <= 90} />
            <KpiRow label="BFR en jours de CA" value={fmtDays(bfrJCA)} sub="j CA" ok={bfrJCA <= 60} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Structure &amp; Rentabilité</div>
            <KpiRow label="Liquidité Générale" value={fmtRatio(liqGen)} sub="Norme ≥ 1.2x" ok={liqGen >= 1.2} />
            <KpiRow label="Autonomie Financière" value={fmtPct(autFinanc)} sub="Norme ≥ 30%" ok={autFinanc >= 0.3} />
            <KpiRow label="Marge EBE" value={fmtPct(margeEBE)} sub="Norme ≥ 10%" ok={margeEBE >= 0.1} />
            <KpiRow label="Marge Nette" value={fmtPct(margeNette)} sub="Norme > 0%" ok={margeNette > 0} />
          </div>
        </div>
      </div>

      {/* ── Section 4 : FORCES ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 18 }}>thumb_up</span>
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#166534' }}>Forces &amp; Atouts Financiers</h3>
            <span style={{ fontSize: '0.72rem', color: '#059669' }}>{nbForces} point{nbForces > 1 ? 's' : ''} fort{nbForces > 1 ? 's' : ''} identifié{nbForces > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {analyse.filter(a => a.type === 'force').map((item, i) => {
            const ts = typeStyle[item.type];
            return (
              <div key={i} style={{ background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', borderLeft: `4px solid ${ts.color}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ts.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span className="material-symbols-outlined" style={{ color: ts.color, fontSize: 18 }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: ts.color }}>{item.titre}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: `${ts.color}20`, color: ts.color, padding: '2px 8px', borderRadius: 20 }}>{item.cat}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.55 }}>{item.detail}</p>
                </div>
              </div>
            );
          })}
          {nbForces === 0 && <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Aucune force identifiée — analyse approfondie recommandée.</div>}
        </div>
      </div>

      {/* ── Section 5 : NEUTRES ── */}
      {nbNeutre > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 18 }}>info</span>
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#92400e' }}>Points à Surveiller</h3>
              <span style={{ fontSize: '0.72rem', color: '#d97706' }}>{nbNeutre} point{nbNeutre > 1 ? 's' : ''} à surveiller</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analyse.filter(a => a.type === 'neutre').map((item, i) => {
              const ts = typeStyle[item.type];
              return (
                <div key={i} style={{ background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', borderLeft: `4px solid ${ts.color}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ts.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <span className="material-symbols-outlined" style={{ color: ts.color, fontSize: 18 }}>{item.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: ts.color }}>{item.titre}</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: `${ts.color}20`, color: ts.color, padding: '2px 8px', borderRadius: 20 }}>{item.cat}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.55 }}>{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 6 : FAIBLESSES ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff1f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: 18 }}>thumb_down</span>
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#be123c' }}>Faiblesses &amp; Points de Vigilance</h3>
            <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>{nbFaiblesses} risque{nbFaiblesses > 1 ? 's' : ''} identifié{nbFaiblesses > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {analyse.filter(a => a.type === 'faiblesse').map((item, i) => {
            const ts = typeStyle[item.type];
            return (
              <div key={i} style={{ background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', borderLeft: `4px solid ${ts.color}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ts.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span className="material-symbols-outlined" style={{ color: ts.color, fontSize: 18 }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: ts.color }}>{item.titre}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: `${ts.color}20`, color: ts.color, padding: '2px 8px', borderRadius: 20 }}>{item.cat}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#be123c', lineHeight: 1.55 }}>{item.detail}</p>
                </div>
              </div>
            );
          })}
          {nbFaiblesses === 0 && <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 10, color: '#059669', fontSize: '0.85rem', textAlign: 'center', border: '1px solid #86efac' }}>✅ Aucune faiblesse majeure détectée — situation financière saine.</div>}
        </div>
      </div>

      {/* ── Section 7 : Recommandations ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: 20 }}>lightbulb</span>
          <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e40af' }}>7. Recommandations &amp; Plan d'Action</h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ...(dso > 60 ? [{ icon: 'payments', color: '#dc2626', action: 'Réduire le DSO (créances clients)', detail: `DSO actuel de ${fmtDays(dso)}. Mettre en place un système de relance automatique, proposer des escomptes pour paiement anticipé, réviser les conditions de crédit accordées aux clients.` }] : []),
            ...(dpo < 30 && dpo > 0 ? [{ icon: 'receipt_long', color: '#d97706', action: 'Négocier des délais fournisseurs plus longs', detail: `DPO de ${fmtDays(dpo)} seulement. Renégocier les conditions de paiement (30-60j) pour améliorer le BFR et la trésorerie disponible.` }] : []),
            ...(rotStock > 90 ? [{ icon: 'warehouse', color: '#d97706', action: 'Optimiser la gestion des stocks', detail: `Rotation de ${fmtDays(rotStock)}. Adopter une méthode JIT (Just-in-Time) ou ABC pour réduire les niveaux de stock et libérer de la trésorerie.` }] : []),
            ...((b.tn || 0) < 0 ? [{ icon: 'account_balance_wallet', color: '#dc2626', action: 'Améliorer la trésorerie nette', detail: 'Trésorerie négative. Envisager une augmentation de capital, un crédit à moyen terme pour financer le BFR, ou la cession d\'actifs non stratégiques.' }] : []),
            ...(margeNette < 0 ? [{ icon: 'trending_down', color: '#dc2626', action: 'Plan de redressement de la rentabilité', detail: 'Résultat net négatif. Analyser poste par poste les charges pour identifier les surcoûts. Revoir la politique tarifaire et la mix produit/service.' }] : []),
            ...(autFinanc < 0.3 ? [{ icon: 'shield', color: '#d97706', action: 'Renforcer les fonds propres', detail: `Autonomie de ${fmtPct(autFinanc)}. Envisager une augmentation de capital, la mise en réserve des bénéfices futurs ou le remboursement progressif des dettes financières.` }] : []),
            ...(bfrJCA > 60 ? [{ icon: 'loop', color: '#d97706', action: 'Réduire le Besoin en Fonds de Roulement', detail: `BFR de ${fmtDays(bfrJCA)} de CA. Agir simultanément sur les 3 leviers : accélérer les encaissements clients, rallonger les délais fournisseurs, réduire les stocks.` }] : []),
            { icon: 'bar_chart', color: '#2563eb', action: 'Mettre en place un tableau de bord mensuel', detail: 'Suivre mensuellement les 8 indicateurs clés : CA, EBE, trésorerie, DSO, DPO, stock, BFR et résultat net. Toute dérive > 10% doit déclencher une action corrective.' },
          ].map(({ icon, color, action, detail }, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 16px', background: `${color}08`, borderRadius: 10, border: `1px solid ${color}25` }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color, fontSize: 17 }}>{icon}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-sub)', marginRight: 6 }}>{i + 1}.</span>{action}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pied de rapport ── */}
      <div style={{ padding: '14px 20px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>📋 Rapport généré par <strong>BAIQ — Balance and Financial Analytics</strong> — Référentiel SCF Algérie (Système Comptable Financier)</span>
        <span className="mono" style={{ color: 'var(--text-sub)' }}>{new Date().toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>

    </div>
  );
}
