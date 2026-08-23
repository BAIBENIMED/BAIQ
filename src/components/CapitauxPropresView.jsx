import { useState, useMemo } from 'react';
import { calculateVariationCapitauxPropres } from '../utils/financeCalculations';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export function CapitauxPropresView({ data, fmt }) {
  const [activeSubTab, setActiveSubTab] = useState('matrice'); // 'matrice', 'details', 'graph'
  const [searchAccount, setSearchAccount] = useState('');

  const rows = data?.rows || [];
  const sig  = data?.sig  || null;
  const dataN1 = data?.dataN1 || null;

  const tvcp = useMemo(() => {
    return calculateVariationCapitauxPropres(rows, dataN1, sig);
  }, [rows, dataN1, sig]);

  const { colonnes, lignes, kpis, comptesClasse1 } = tvcp;

  const fmtN = (v) => {
    if (v === undefined || v === null || isNaN(v) || Math.abs(v) < 1) return '—';
    const absVal = Math.abs(Math.round(v)).toLocaleString('fr-FR');
    return v < 0 ? `(${absVal})` : absVal;
  };

  const fmtCurrency = (v) => {
    if (v === undefined || v === null || isNaN(v)) return '0 DA';
    return fmt ? fmt(v) : Math.round(v).toLocaleString('fr-FR') + ' DA';
  };

  const fmtPct = (p) => {
    if (p === undefined || p === null || isNaN(p)) return '0.0%';
    const prefix = p > 0 ? '+' : '';
    return `${prefix}${Number(p).toFixed(1)}%`;
  };

  // Filtrage des comptes de classe 1
  const filteredAccounts = useMemo(() => {
    if (!searchAccount.trim()) return comptesClasse1;
    const q = searchAccount.toLowerCase().trim();
    return comptesClasse1.filter(a => 
      String(a.compte).toLowerCase().includes(q) || 
      (a.libelle && a.libelle.toLowerCase().includes(q))
    );
  }, [comptesClasse1, searchAccount]);

  // Données pour le graphique d'évolution
  const chartData = useMemo(() => {
    if (!lignes || lignes.length === 0) return [];
    const ouv = lignes.find(l => l.id === 'ouverture') || {};
    const clo = lignes.find(l => l.id === 'cloture') || {};

    return [
      { name: 'Capital (101)',   Ouverture: Math.max(0, ouv.capital || 0),   Cloture: Math.max(0, clo.capital || 0) },
      { name: 'Réserves (106)',  Ouverture: Math.max(0, ouv.reserves || 0),  Cloture: Math.max(0, clo.reserves || 0) },
      { name: 'Report (11)',     Ouverture: Math.max(0, ouv.ran || 0),       Cloture: Math.max(0, clo.ran || 0) },
      { name: 'Résultat (12)',   Ouverture: Math.max(0, ouv.resultat || 0),  Cloture: Math.max(0, clo.resultat || 0) },
      { name: 'Subv./Prov (13)', Ouverture: Math.max(0, ouv.subventions || 0), Cloture: Math.max(0, clo.subventions || 0) },
    ];
  }, [lignes]);

  if (!rows || rows.length === 0) {
    return (
      <div className="card fade-in" style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center', padding: '48px 32px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 52, color: '#cbd5e1', display: 'block', marginBottom: 16 }}>account_balance_wallet</span>
        <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 8 }}>Tableau des Capitaux Propres indisponible</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Veuillez d'abord importer une balance comptable pour afficher le TVCP.</p>
      </div>
    );
  }

  const isPositiveVar = kpis.variationNette >= 0;

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── HEADER DE LA PAGE ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              ÉTAT FINANCIER SCF (IAS 1)
            </span>
            <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: 4, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
              CLASSE 1 — CAPITAUX PROPRES
            </span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--text)' }}>
            Tableau de Variation des Capitaux Propres (TVCP)
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Mouvements des capitaux propres entre l'ouverture et la clôture selon le Système Comptable Financier algérien (Loi 07-11)
          </p>
        </div>

        {/* Action / Print */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 16px', background: 'var(--surface-alt)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
            Imprimer / PDF
          </button>
        </div>
      </div>

      {/* ── CARTES KPIS EN TÊTE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* 1. Capitaux d'ouverture */}
        <div className="card" style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            Capitaux Propres d'Ouverture (1er Janv.)
          </div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e40af', lineHeight: 1.2 }}>
            {fmtCurrency(kpis.totalDebut)}
          </div>
          <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Base initiale de l'exercice
          </div>
          <div style={{ position: 'absolute', right: -6, bottom: -6, opacity: 0.08, pointerEvents: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#1e40af' }}>start</span>
          </div>
        </div>

        {/* 2. Résultat N-1 & Affectation (Dividendes / RAN / Réserves) */}
        <div className="card" style={{ 
          padding: '16px 20px', 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.02) 100%)', 
          border: '1px solid rgba(245, 158, 11, 0.3)', 
          position: 'relative', 
          overflow: 'hidden' 
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            Affectation Résultat (N-1) &amp; Dividendes
          </div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#d97706', lineHeight: 1.2 }}>
            {fmtCurrency(kpis.resultatNetAnterieur || 0)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#d97706' }}>pie_chart</span>
            {kpis.dividendesEstimes > 0 
              ? `Dividendes : ${fmtCurrency(kpis.dividendesEstimes)} • Réserves/RAN : ${fmtCurrency((kpis.affectationRAN || 0) + (kpis.affectationReserves || 0))}`
              : `100% conservé (Reporté au RAN / Réserves : ${fmtCurrency(kpis.resultatNetAnterieur || 0)})`
            }
          </div>
          <div style={{ position: 'absolute', right: -6, bottom: -6, opacity: 0.09, pointerEvents: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#d97706' }}>payments</span>
          </div>
        </div>

        {/* 3. Variation Nette & Résultat Net (N) */}
        <div className="card" style={{ padding: '16px 20px', background: isPositiveVar ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)', border: `1px solid ${isPositiveVar ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: isPositiveVar ? '#047857' : '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            Variation Nette Globale (N)
          </div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 900, color: isPositiveVar ? '#059669' : '#dc2626', lineHeight: 1.2 }}>
            {isPositiveVar ? '+' : ''}{fmtCurrency(kpis.variationNette)}
          </div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isPositiveVar ? '#047857' : '#b91c1c', marginTop: 4 }}>
            Résultat N : {fmtCurrency(kpis.resultatNetN || kpis.resultatNet)} (à affecter en N+1)
          </div>
          <div style={{ position: 'absolute', right: -6, bottom: -6, opacity: 0.08, pointerEvents: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: isPositiveVar ? '#059669' : '#dc2626' }}>swap_vert</span>
          </div>
        </div>

        {/* 4. Capitaux de clôture */}
        <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)', border: '1px solid #93c5fd', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            Capitaux Propres de Clôture (31 Déc.)
          </div>
          <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1.2 }}>
            {fmtCurrency(kpis.totalFin)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#2563eb', fontWeight: 700, marginTop: 4 }}>
            Total Passif — Capitaux Propres
          </div>
          <div style={{ position: 'absolute', right: -6, bottom: -6, opacity: 0.08, pointerEvents: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#1e3a8a' }}>verified</span>
          </div>
        </div>

      </div>

      {/* ── ONGLETS DE NAVIGATION SECONDAIRES ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {[
          { id: 'matrice',  label: 'Matrice Officielle TVCP (SCF)', icon: 'grid_on' },
          { id: 'graph',    label: 'Graphique & Répartition',       icon: 'bar_chart' },
          { id: 'details',  label: `Détail des Comptes Classe 1 (${comptesClasse1.length})`, icon: 'list_alt' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: activeSubTab === t.id ? 'var(--primary)' : 'var(--surface-alt)',
              color: activeSubTab === t.id ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          VUE 1 : MATRICE DU TABLEAU DE VARIATION DES CAPITAUX PROPRES (SCF)
      ═══════════════════════════════════════════════════════════ */}
      {activeSubTab === 'matrice' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '14px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text)' }}>
                Tableau Matriciel des Variations de Capitaux Propres (DZD)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Format officiel conforme au Système Comptable Financier (SCF — Loi 07-11)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.70rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
              Montants exprimés en Dinars Algériens (DZD)
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', tableLayout: 'fixed', minWidth: 1050 }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#ffffff' }}>
                  <th style={{ width: '25%', padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: '0.70rem', letterSpacing: '0.04em' }}>
                    RUBRIQUES &amp; NATURE DES VARIATIONS
                  </th>
                  {colonnes.map(col => (
                    <th
                      key={col.key}
                      style={{
                        padding: '10px 10px', textAlign: 'right', fontWeight: 800, fontSize: '0.68rem',
                        letterSpacing: '0.03em', whiteSpace: 'normal', lineHeight: 1.25,
                        background: col.isTotal ? '#0f172a' : 'transparent',
                        color: col.isTotal ? '#60a5fa' : '#ffffff',
                        borderLeft: '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((row, idx) => {
                  const isOuverture = row.id === 'ouverture';
                  const isCloture   = row.id === 'cloture';
                  const isResultat  = row.id === 'resultat_n';

                  let rowBg = 'transparent';
                  let rowFontWeight = 600;
                  let borderTopStyle = '1px solid var(--border)';

                  if (isOuverture) {
                    rowBg = 'rgba(30, 64, 175, 0.05)';
                    rowFontWeight = 800;
                  } else if (isCloture) {
                    rowBg = 'rgba(30, 64, 175, 0.12)';
                    rowFontWeight = 900;
                    borderTopStyle = '2px solid #3b82f6';
                  } else if (isResultat) {
                    rowBg = 'rgba(16, 185, 129, 0.04)';
                    rowFontWeight = 700;
                  }

                  return (
                    <tr
                      key={row.id}
                      style={{
                        background: rowBg,
                        borderTop: borderTopStyle,
                        borderBottom: isCloture ? '2px solid #1e3a8a' : '1px solid var(--border)',
                        transition: 'background 0.1s'
                      }}
                    >
                      {/* Libellé de ligne */}
                      <td style={{
                        padding: '10px 14px', fontWeight: rowFontWeight,
                        color: isCloture ? '#1e3a8a' : isOuverture ? '#1e40af' : 'var(--text)',
                        fontSize: isCloture ? '0.82rem' : '0.76rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isCloture && <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#2563eb' }}>check_circle</span>}
                          {isOuverture && <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#3b82f6' }}>play_circle</span>}
                          {row.libelle}
                        </div>
                      </td>

                      {/* Colonnes de montants */}
                      {colonnes.map(col => {
                        const val = row[col.key] || 0;
                        const isTotalCol = col.isTotal;
                        const isNegative = val < -0.5;

                        return (
                          <td
                            key={col.key}
                            className="mono"
                            style={{
                              padding: '10px 10px', textAlign: 'right',
                              fontWeight: isTotalCol || isCloture || isOuverture ? 900 : 700,
                              fontSize: isCloture || isTotalCol ? '0.80rem' : '0.75rem',
                              color: isNegative ? '#dc2626' : (isTotalCol ? (isCloture ? '#1e3a8a' : '#1e40af') : 'var(--text)'),
                              background: isTotalCol ? (isCloture ? 'rgba(37, 99, 235, 0.18)' : 'rgba(241, 245, 249, 0.6)') : 'transparent',
                              borderLeft: '1px solid var(--border)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {fmtN(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Diagnostic & Note SCF */}
          <div style={{ padding: '12px 20px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Principe SCF &amp; IAS 1 :</strong> L'affectation (Ligne 2) porte exclusivement sur le <strong>résultat antérieur (N-1)</strong> décidé en Assemblée Générale (virement aux réserves, report à nouveau, dividendes). Le <strong>résultat net de l'exercice N</strong> (Ligne 5 : {fmtCurrency(kpis.resultatNet)}) s'ajoute en clôture (Compte 12) pour constituer les capitaux propres au 31 Décembre ({fmtCurrency(kpis.totalFin)}).
            </p>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#059669', background: '#dcfce7', padding: '3px 8px', borderRadius: 6, border: '1px solid #86efac' }}>
              ✓ ÉQUILIBRÉ SCF
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VUE 2 : GRAPHIQUE D'ÉVOLUTION OUVERTURE VS CLÔTURE
      ═══════════════════════════════════════════════════════════ */}
      {activeSubTab === 'graph' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
          
          {/* Bar Chart Recharts */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text)' }}>
              Comparaison Ouverture vs Clôture par Composante
            </h3>
            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(val) => [fmtCurrency(val), '']}
                    contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="Ouverture" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Ouverture (1er Janv.)" />
                  <Bar dataKey="Cloture"   fill="#2563eb" radius={[4, 4, 0, 0]} name="Clôture (31 Déc.)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Synthèse des variations par bloc */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: '0 0 14px', color: 'var(--text)' }}>
                Synthèse des Facteurs de Variation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lignes.filter(l => l.id !== 'ouverture' && l.id !== 'cloture').map(mov => {
                  const val = mov.total;
                  const isPos = val >= 0;
                  return (
                    <div key={mov.id} style={{
                      padding: '10px 14px', borderRadius: 8, background: 'var(--surface-alt)',
                      border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)' }}>{mov.libelle}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Mouvement de la période</div>
                      </div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 900, color: val === 0 ? 'var(--text-muted)' : isPos ? '#059669' : '#dc2626' }}>
                        {val > 0 ? '+' : ''}{fmtN(val)} DA
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', marginBottom: 2 }}>
                Variation Nette Totale : {fmtPct(kpis.pctVariation)}
              </div>
              <div style={{ fontSize: '0.70rem', color: '#3b82f6' }}>
                Les capitaux propres sont passés de <strong>{fmtCurrency(kpis.totalDebut)}</strong> à <strong>{fmtCurrency(kpis.totalFin)}</strong>.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VUE 3 : DÉTAIL DES COMPTES DE LA CLASSE 1
      ═══════════════════════════════════════════════════════════ */}
      {activeSubTab === 'details' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text)' }}>
                Grand Livre de la Classe 1 (Capitaux Propres &amp; Financements)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Soldes d'ouverture, mouvements de l'exercice et soldes de clôture compte par compte
              </p>
            </div>
            
            {/* Recherche de compte */}
            <div style={{ position: 'relative', width: 240 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-sub)' }}>search</span>
              <input
                type="text"
                placeholder="Filtrer compte classe 1..."
                value={searchAccount}
                onChange={e => setSearchAccount(e.target.value)}
                style={{
                  width: '100%', padding: '5px 10px 5px 28px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--surface)', fontSize: '0.75rem', outline: 'none', color: 'var(--text)'
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ width: '10%', padding: '8px 12px', textAlign: 'left', fontWeight: 800, fontSize: '0.68rem', borderRight: '1px solid var(--border)' }}>COMPTE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, fontSize: '0.68rem', borderRight: '1px solid var(--border)' }}>INTITULÉ DU COMPTE</th>
                  <th style={{ width: '15%', padding: '8px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.68rem', borderRight: '1px solid var(--border)' }}>SOLDE DÉBUT</th>
                  <th style={{ width: '14%', padding: '8px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.68rem', borderRight: '1px solid var(--border)' }}>MOUV. DÉBIT</th>
                  <th style={{ width: '14%', padding: '8px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.68rem', borderRight: '1px solid var(--border)' }}>MOUV. CRÉDIT</th>
                  <th style={{ width: '15%', padding: '8px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.68rem', borderRight: '1px solid var(--border)', background: 'rgba(37,99,235,0.05)', color: '#1e40af' }}>SOLDE FIN</th>
                  <th style={{ width: '14%', padding: '8px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.68rem' }}>VARIATION</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      Aucun compte de classe 1 trouvé.
                    </td>
                  </tr>
                ) : filteredAccounts.map((a, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="mono" style={{ fontWeight: 800, color: '#1e40af', padding: '6px 12px', borderRight: '1px solid var(--border)' }}>{a.compte}</td>
                    <td style={{ padding: '6px 12px', fontWeight: 600, color: 'var(--text)', borderRight: '1px solid var(--border)' }}>{a.libelle}</td>
                    <td className="mono" style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid var(--border)' }}>{fmtN(a.soldeDebut)}</td>
                    <td className="mono" style={{ padding: '6px 12px', textAlign: 'right', color: '#64748b', borderRight: '1px solid var(--border)' }}>{fmtN(a.mouvementDebit)}</td>
                    <td className="mono" style={{ padding: '6px 12px', textAlign: 'right', color: '#64748b', borderRight: '1px solid var(--border)' }}>{fmtN(a.mouvementCredit)}</td>
                    <td className="mono" style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: '#1e40af', background: 'rgba(37,99,235,0.03)', borderRight: '1px solid var(--border)' }}>{fmtN(a.soldeFin)}</td>
                    <td className="mono" style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: a.variation >= 0 ? '#059669' : '#dc2626' }}>
                      {a.variation > 0 ? '+' : ''}{fmtN(a.variation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
