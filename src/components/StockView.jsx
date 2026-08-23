import { useState, useMemo } from 'react';
import { calculateStockEvolution } from '../utils/financeCalculations';

export function StockView({ rows, ratios, formatCurrency }) {
  const [activeTab, setActiveTab] = useState('synthese');

  const fmt = (v) => formatCurrency ? formatCurrency(v) : (v || 0).toLocaleString('fr-FR');
  const fmtPct = (p) => {
    if (p === undefined || p === null || isNaN(p)) return '0.0%';
    const prefix = p > 0 ? '+' : '';
    return `${prefix}${p.toFixed(1)}%`;
  };
  const data = calculateStockEvolution(rows);

  // Indicateurs de rotation et délais du stock
  const achatsConsommes = ratios?.achats || ratios?.achatsConsommes || 0;
  const stockMoyen = ratios?.stockMoyen || ((data.totalInitial + data.totalFinal) / 2) || data.totalFinal;
  const rotationJours = ratios?.rotationStocks || (achatsConsommes > 0 ? (stockMoyen / achatsConsommes) * 360 : 0);
  const tauxRotation = ratios?.tauxRotationStocks || (stockMoyen > 0 ? (achatsConsommes / stockMoyen) : 0);
  const chiffreAffaires = ratios?.chiffreAffaires || ratios?.ca || (achatsConsommes * 1.5) || 1;

  // Analyse Financière BFR & Trésorerie
  const cashImpact = -data.totalVariation; // Déstockage = Cash libéré (+), Stockage = Cash consommé (-)
  const isCashPositive = cashImpact >= 0;
  const coutPossessionEstime = Math.round(stockMoyen * 0.12); // Coût annuel de portage/magasinage estimé à 12%
  const gainPortageEstime = data.totalVariation < 0 ? Math.round(Math.abs(data.totalVariation) * 0.12) : 0;

  // Statut de Sécurité & Risque de Rupture
  let securiteStatut = {
    titre: 'Stock Sécurisé & Équilibré',
    badgeCls: 'badge-green',
    color: '#059669',
    bg: '#ecfdf5',
    bdr: '#a7f3d0',
    icon: 'verified_user',
    description: 'Le niveau de stock actuel couvre les besoins normaux d\'exploitation sans surcoût excessif de possession.'
  };

  if (rotationJours <= 15 && rotationJours > 0) {
    securiteStatut = {
      titre: 'Flux Très Tendu — Risque de Rupture',
      badgeCls: 'badge-red',
      color: '#dc2626',
      bg: '#fef2f2',
      bdr: '#fecaca',
      icon: 'warning',
      description: 'Le délai d\'écoulement est inférieur à 15 jours. Risque élevé de rupture en cas de retard fournisseur ou pic de commandes.'
    };
  } else if (rotationJours > 15 && rotationJours <= 45) {
    securiteStatut = {
      titre: 'Gestion Optimisée / Flux Tendu Maîtrisé',
      badgeCls: 'badge-blue',
      color: '#2563eb',
      bg: '#eff6ff',
      bdr: '#bfdbfe',
      icon: 'speed',
      description: 'Rotation rapide et efficace. Le BFR est très allégé avec un bon réassortiment.'
    };
  } else if (rotationJours > 90) {
    securiteStatut = {
      titre: 'Sur-Stockage — Immobilisation de BFR',
      badgeCls: 'badge-amber',
      color: '#d97706',
      bg: '#fffbeb',
      bdr: '#fde68a',
      icon: 'inventory',
      description: 'Le stock dépasse 90 jours de consommation. Trésorerie excessivement immobilisée et risque de dépréciation/obsolescence.'
    };
  }

  // Rapprochement comptable Bilan (Classe 3) vs TCR (Comptes 603 & 72)
  const comptesConcordance = useMemo(() => {
    let deb603 = 0, cred603 = 0, deb72 = 0, cred72 = 0;
    (rows || []).forEach(r => {
      if (r.ignore || !r.compte) return;
      const c = String(r.compte).trim();
      const deb = Number(r.soldeFinDebit !== undefined ? r.soldeFinDebit : r.debit) || 0;
      const cred = Number(r.soldeFinCredit !== undefined ? r.soldeFinCredit : r.credit) || 0;
      if (c.startsWith('603')) {
        deb603 += deb;
        cred603 += cred;
      } else if (c.startsWith('72')) {
        deb72 += deb;
        cred72 += cred;
      }
    });

    const net603 = deb603 - cred603; // Débit 603 = Déstockage charges, Crédit 603 = Stockage
    const net72  = cred72 - deb72;   // Crédit 72 = Stockage produits, Débit 72 = Déstockage

    return { deb603, cred603, net603, deb72, cred72, net72 };
  }, [rows]);

  if (!data || data.categories.length === 0) {
    return (
      <div className="card fade-in" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 42, color: '#cbd5e1', display: 'block', marginBottom: 12 }}>inventory_2</span>
        <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Aucune donnée de stock (Classe 3)</h4>
        <p style={{ fontSize: '0.8rem' }}>La balance ne contient aucun compte de stock actif.</p>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      
      {/* ── BANDEAU EN-TÊTE : KPI & ROTATION ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#38bdf8' }}>warehouse</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                Évolution, Diagnostic Financier &amp; Sécurité des Stocks
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Analyse SCF (IAS 2) • Impact BFR &amp; Trésorerie • Contrôle de Surconsommation
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: isCashPositive ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: isCashPositive ? '#34d399' : '#f87171', border: `1px solid ${isCashPositive ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`, padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isCashPositive ? 'savings' : 'outbox'}</span>
              Impact Trésorerie : {isCashPositive ? '+' : ''}{fmt(cashImpact)}
            </span>
          </div>
        </div>

        {/* 4 Grandes Métriques Clés */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {/* 1. Délai d'écoulement */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Délai d'Écoulement</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span className="mono" style={{ fontSize: '1.75rem', fontWeight: 900, color: rotationJours <= 90 ? '#34d399' : '#fbbf24' }}>
                {Math.round(rotationJours)}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>jours</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: 2 }}>
              Norme conseillée : 30 à 90 jours
            </span>
          </div>

          {/* 2. Taux de rotation */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Vitesse de Rotation</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span className="mono" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38bdf8' }}>
                {tauxRotation.toFixed(1)}x
              </span>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>/ an</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: 2 }}>
              Renouvellements du stock par an
            </span>
          </div>

          {/* 3. Stock Moyen & Variation */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Stock Final au 31 Déc.</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', marginTop: 4 }} className="mono">
              {fmt(data.totalFinal)}
            </div>
            <span style={{ fontSize: '0.68rem', color: data.totalVariation <= 0 ? '#34d399' : '#fbbf24', display: 'block', marginTop: 2, fontWeight: 700 }}>
              Var : {data.totalVariation > 0 ? '+' : ''}{fmt(data.totalVariation)} ({fmtPct(data.totalPctVariation)})
            </span>
          </div>

          {/* 4. Statut Sécurité */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Niveau de Sécurité</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: securiteStatut.color }}>{securiteStatut.icon}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: securiteStatut.color }}>
                {securiteStatut.titre}
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#cbd5e1', display: 'block', marginTop: 4, lineHeight: 1.2 }}>
              Stock d'alerte sous contrôle
            </span>
          </div>
        </div>
      </div>

      {/* ── ONGLETS D'ANALYSE APPROFONDIE ── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'synthese',     label: '1. Synthèse des Stocks par Catégorie', icon: 'grid_view' },
          { id: 'tresorerie',   label: '2. Diagnostic Trésorerie & BFR',        icon: 'payments' },
          { id: 'securite',     label: '3. Stock de Sécurité & Rendement Matières', icon: 'shield' },
          { id: 'rapprochement',label: '4. Rapprochement SCF (Comptes 603 / 72)', icon: 'account_tree' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: activeTab === t.id ? 'var(--primary)' : 'var(--surface-alt)',
              color: activeTab === t.id ? '#ffffff' : 'var(--text-muted)',
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
          TAB 1 : SYNTHÈSE DES STOCKS PAR CATÉGORIE (SCF)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'synthese' && (
        <div className="space-y-6">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>category</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Détail des 5 Rubriques de Stock (Classe 3)</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mouvement de stockage vs déstockage compte par compte</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Mouvement Global :</span>
                <span className={`badge ${data.globalMouvement === 'STOCKAGE' ? 'badge-green' : data.globalMouvement === 'DÉSTOCKAGE' ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '0.72rem', padding: '5px 12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>
                    {data.globalMouvement === 'STOCKAGE' ? 'trending_up' : data.globalMouvement === 'DÉSTOCKAGE' ? 'trending_down' : 'remove'}
                  </span>
                  {data.globalMouvement} ({fmt(data.totalVariation)} | {fmtPct(data.totalPctVariation)})
                </span>
              </div>
            </div>

            {/* Categories Cards Grid */}
            <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, background: 'var(--surface-alt)' }}>
              {data.categories.map(cat => {
                const isStockage = cat.mouvement === 'STOCKAGE';
                const isDestockage = cat.mouvement === 'DÉSTOCKAGE';

                return (
                  <div key={cat.code} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)', marginTop: 2, flexShrink: 0 }}>{cat.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.3 }}>{cat.label}</span>
                        </div>
                        <span className={`badge ${isStockage ? 'badge-green' : isDestockage ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11, marginRight: 2 }}>
                            {isStockage ? 'arrow_upward' : isDestockage ? 'arrow_downward' : 'drag_handle'}
                          </span>
                          {cat.mouvement}
                        </span>
                      </div>

                      <div style={{ padding: '10px 12px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>DÉBUT (1er Janv.) :</span>
                          <span className="mono" style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(cat.stockInitial)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>FIN (31 Déc.) :</span>
                          <span className="mono" style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(cat.stockFinal)}</span>
                        </div>
                        <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.80rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>VARIATION NETTE :</span>
                          <span className="mono" style={{ fontWeight: 800, fontSize: '0.86rem', color: isStockage ? 'var(--green)' : isDestockage ? '#d97706' : 'var(--text)' }}>
                            {cat.variation > 0 ? `+${fmt(cat.variation)}` : fmt(cat.variation)}
                            <span style={{ fontSize: '0.72rem', marginLeft: 5, opacity: 0.9 }}>
                              ({fmtPct(cat.pctVariation)})
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: isStockage ? 'var(--green)' : isDestockage ? '#d97706' : 'var(--text-sub)', flexShrink: 0 }}>info</span>
                      <span style={{ lineHeight: 1.25 }}>{cat.impactSCF}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tableau Récapitulatif Bilan */}
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <table className="data-table compact-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>CODE</th>
                    <th>RUBRIQUE DU STOCK</th>
                    <th className="right">STOCK INIT. (1er Janv.)</th>
                    <th className="right">STOCK FIN. (31 Déc.)</th>
                    <th className="right">VAR. VALEUR</th>
                    <th className="right">VAR. (%)</th>
                    <th style={{ textAlign: 'center' }}>MOUVEMENT</th>
                    <th>IMPACT COMPTABLE (SCF)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((cat, i) => (
                    <tr key={i}>
                      <td><span className="mono" style={{ fontWeight: 700, color: 'var(--primary-dk)' }}>{cat.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{cat.label}</td>
                      <td className="right mono">{fmt(cat.stockInitial)}</td>
                      <td className="right mono" style={{ fontWeight: 700 }}>{fmt(cat.stockFinal)}</td>
                      <td className="right mono" style={{ fontWeight: 800, color: cat.variation > 0 ? 'var(--green)' : cat.variation < 0 ? '#d97706' : 'inherit' }}>
                        {cat.variation > 0 ? `+${fmt(cat.variation)}` : fmt(cat.variation)}
                      </td>
                      <td className="right mono" style={{ fontWeight: 800, color: cat.variation > 0 ? 'var(--green)' : cat.variation < 0 ? '#d97706' : 'inherit' }}>
                        {fmtPct(cat.pctVariation)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${cat.mouvement === 'STOCKAGE' ? 'badge-green' : cat.mouvement === 'DÉSTOCKAGE' ? 'badge-amber' : 'badge-blue'}`}>
                          {cat.mouvement}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{cat.impactSCF}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2" style={{ fontWeight: 800 }}>TOTAL DES STOCKS (CLASSE 3)</td>
                    <td className="right mono">{fmt(data.totalInitial)}</td>
                    <td className="right mono" style={{ fontWeight: 800 }}>{fmt(data.totalFinal)}</td>
                    <td className="right mono" style={{ fontWeight: 800, color: data.totalVariation > 0 ? 'var(--green)' : data.totalVariation < 0 ? '#d97706' : 'inherit' }}>
                      {data.totalVariation > 0 ? `+${fmt(data.totalVariation)}` : fmt(data.totalVariation)}
                    </td>
                    <td className="right mono" style={{ fontWeight: 800, color: data.totalVariation > 0 ? 'var(--green)' : data.totalVariation < 0 ? '#d97706' : 'inherit' }}>
                      {fmtPct(data.totalPctVariation)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${data.globalMouvement === 'STOCKAGE' ? 'badge-green' : data.globalMouvement === 'DÉSTOCKAGE' ? 'badge-amber' : 'badge-blue'}`}>
                        {data.globalMouvement}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-dk)' }}>
                      {data.globalMouvement === 'STOCKAGE' ? 'Augmentation globale des réserves' : 'Consommation globale des stocks'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2 : DIAGNOSTIC TRÉSORERIE & BFR
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'tresorerie' && (
        <div className="space-y-6">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#059669' }}>payments</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 800 }}>
                  Impact du Stock sur la Trésorerie &amp; le BFR
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Conversion des stocks en liquidités et coûts cachés de détention
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Carte 1 : Cash Généré / Consommé */}
              <div style={{ padding: '16px', borderRadius: 12, background: isCashPositive ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCashPositive ? '#bbf7d0' : '#fecaca'}` }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 800, color: isCashPositive ? '#166534' : '#991b1b', textTransform: 'uppercase', marginBottom: 4 }}>
                  {isCashPositive ? '💰 Trésorerie Libérée (Cash-In)' : '📉 Trésorerie Immobilisée (Cash-Out)'}
                </div>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: isCashPositive ? '#15803d' : '#b91c1c' }}>
                  {isCashPositive ? '+' : ''}{fmt(cashImpact)}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.73rem', color: 'var(--text)', lineHeight: 1.4 }}>
                  {isCashPositive 
                    ? `Le déstockage de l'exercice a permis de désengager ${fmt(Math.abs(data.totalVariation))} du BFR pour alimenter directement les disponibilités bancaires.`
                    : `L'augmentation des stocks a mobilisé ${fmt(data.totalVariation)} de trésorerie nette qui reste temporairement gelée dans les entrepôts.`
                  }
                </p>
              </div>

              {/* Carte 2 : Coût de Possession Annuel */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Coût de Possession Annuel Estimé (12%)
                </div>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e40af' }}>
                  {fmt(coutPossessionEstime)} / an
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Comprend les coûts d'entreposage, manutention, assurance, surveillance et le coût d'opportunité des capitaux immobilisés (base moyenne : {fmt(stockMoyen)}).
                </p>
              </div>

              {/* Carte 3 : Économies de Stockage Réalisées */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Économies de Portages Réalisées
                </div>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: gainPortageEstime > 0 ? '#059669' : 'var(--text)' }}>
                  {gainPortageEstime > 0 ? `+${fmt(gainPortageEstime)}` : '0 DZD'}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {gainPortageEstime > 0
                    ? `Gain récurrent annuel généré grâce à la diminution des volumes stockés et la baisse des frais de gardiennage/assurance.`
                    : `Aucune baisse de coûts de stockage constatée (maintien ou hausse des volumes).`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3 : STOCK DE SÉCURITÉ & CONTRÔLE DE SURCONSOMMATION
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'securite' && (
        <div className="space-y-6">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#2563eb' }}>shield</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 800 }}>
                  Contrôle du Stock de Sécurité &amp; Détection de Surconsommation
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Validation du seuil de rupture et du rendement réel des matières
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* Jauge Stock de Sécurité */}
              <div style={{ padding: '16px', borderRadius: 12, background: securiteStatut.bg, border: `1px solid ${securiteStatut.bdr}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: securiteStatut.color }}>{securiteStatut.icon}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: securiteStatut.color, textTransform: 'uppercase' }}>
                    {securiteStatut.titre}
                  </span>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                    <span>Couverture Réelle :</span>
                    <span className="mono">{Math.round(rotationJours)} Jours</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (rotationJours / 120) * 100)}%`,
                      background: rotationJours <= 15 ? '#ef4444' : rotationJours <= 45 ? '#3b82f6' : rotationJours <= 90 ? '#10b981' : '#f59e0b',
                      borderRadius: 4
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>
                    <span>0j (Rupture)</span>
                    <span>30j (Alerte)</span>
                    <span>60j (Sécurisé)</span>
                    <span>90j+ (Sur-stock)</span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text)', lineHeight: 1.45 }}>
                  {securiteStatut.description}
                </p>
              </div>

              {/* Contrôle Anti-Surconsommation (Rendement Matières) */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#d97706' }}>factory</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                    Audit de Surconsommation &amp; Rendement
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Achats consommés (60) :</span>
                    <span className="mono" style={{ fontWeight: 800 }}>{fmt(achatsConsommes)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Taux d'absorption matières :</span>
                    <span className="mono" style={{ fontWeight: 800, color: '#1e40af' }}>
                      {((achatsConsommes / chiffreAffaires) * 100).toFixed(1)}% du CA
                    </span>
                  </div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 8, background: '#fff', border: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text)', lineHeight: 1.4 }}>
                  <strong>Règle d'audit :</strong> En cas de déstockage de matières premières, vérifier que la production finie et vendue a augmenté dans les mêmes proportions pour éliminer tout soupçon de gaspillage, coulage ou rebus non déclarés.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 4 : RAPPROCHEMENT COMPTABLE SCF (CLASSE 3 VS 603/72)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'rapprochement' && (
        <div className="space-y-6">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#7c3aed' }}>account_tree</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 800 }}>
                  Rapprochement d'Audit Comptable : Variation Bilan vs Comptes 603 &amp; 72
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Contrôle de concordance entre la variation des stocks (Bilan Actif) et les charges/produits (TCR)
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {/* Approvisionnements (30/31/32 vs 603) */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e40af', marginBottom: 8, textTransform: 'uppercase' }}>
                  📦 Approvisionnements &amp; Marchandises (603)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mouvement Débit 603 (Déstockage) :</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{fmt(comptesConcordance.deb603)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mouvement Crédit 603 (Stockage) :</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{fmt(comptesConcordance.cred603)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>Solde Net Compte 603 :</span>
                    <span className="mono" style={{ color: comptesConcordance.net603 > 0 ? '#d97706' : '#059669' }}>
                      {fmt(comptesConcordance.net603)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Production Stockée (35 vs 72) */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#047857', marginBottom: 8, textTransform: 'uppercase' }}>
                  🏭 Production Stockée (72)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mouvement Crédit 72 (Stockage PF) :</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{fmt(comptesConcordance.cred72)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mouvement Débit 72 (Déstockage PF) :</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{fmt(comptesConcordance.deb72)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>Solde Net Compte 72 :</span>
                    <span className="mono" style={{ color: comptesConcordance.net72 > 0 ? '#059669' : '#d97706' }}>
                      {fmt(comptesConcordance.net72)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2563eb' }}>fact_check</span>
              <span style={{ fontSize: '0.74rem', color: '#1e40af', lineHeight: 1.4 }}>
                <strong>Principe d'inversion SCF :</strong> Un compte 603 débiteur ou 72 débiteur traduit un <em>déstockage</em> (consommation ou vente sur stocks antérieurs), tandis qu'un solde créditeur traduit un <em>stockage</em> (économie de charges ou production mise en réserve).
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
