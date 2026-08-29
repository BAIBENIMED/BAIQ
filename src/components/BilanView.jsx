import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AccountDetailDrawer } from './AccountDetailDrawer';
import { EmptyState } from './EmptyState';

export function BilanView({ data, dataN1, rows, formatCurrency }) {
  const [drawerState, setDrawerState] = useState({ isOpen: false, title: '', accountPrefixes: [], excludePrefixes: [] });
  const [viewMode, setViewMode] = useState('single'); // 'single', 'comparative', 'history'

  // Ces hooks doivent être appelés inconditionnellement à chaque rendu (Rules of Hooks) :
  // on utilise des initialiseurs paresseux qui tolèrent data/dataN1 absents.
  const hasN1 = !!dataN1?.bilan;
  const [frngN2, setFrngN2] = useState(() => hasN1 ? dataN1.bilan.frng * 0.9 : (data?.frng || 0) * 0.8);
  const [bfrN2, setBfrN2] = useState(() => hasN1 ? dataN1.bilan.bfr * 0.85 : (data?.bfr || 0) * 0.75);
  const [tnN2, setTnN2] = useState(() => hasN1 ? dataN1.bilan.tn * 0.95 : (data?.tn || 0) * 0.85);

  const fmt = (v) => formatCurrency ? formatCurrency(v) : (v || 0).toLocaleString('fr-FR');
  const fmtPct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

  if (!data) return (
    <EmptyState icon="account_tree" title="Bilan non disponible" message="Veuillez importer une balance comptable." maxWidth={420} />
  );

  const totalActifN  = (data.emploisStables || 0) + (data.actifCirculant || 0) + (data.tresorerieActive || 0);
  const totalActifN1 = dataN1?.bilan ? ((dataN1.bilan.emploisStables || 0) + (dataN1.bilan.actifCirculant || 0) + (dataN1.bilan.tresorerieActive || 0)) : 0;

  const openDrillDown = (title, prefixes, exclude = []) => {
    setDrawerState({ isOpen: true, title, accountPrefixes: prefixes, excludePrefixes: exclude });
  };

  const isComparative = viewMode === 'comparative';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="section-title">Bilan Fonctionnel</div>
          <div className="section-sub" style={{ marginBottom: 0 }}>Analyse de la structure financière et de l'équilibre des ressources. Cliquez sur un poste pour le détail.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            <button
              onClick={() => setViewMode('single')}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: viewMode === 'single' ? 'var(--primary)' : 'transparent', color: viewMode === 'single' ? '#fff' : 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Exercice N
            </button>
            {hasN1 && (
              <button
                onClick={() => setViewMode('comparative')}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: viewMode === 'comparative' ? 'var(--primary)' : 'transparent', color: viewMode === 'comparative' ? '#fff' : 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
              >
                📊 N vs N-1
              </button>
            )}
            <button
              onClick={() => setViewMode('history')}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: viewMode === 'history' ? 'var(--primary)' : 'transparent', color: viewMode === 'history' ? '#fff' : 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
            >
              📈 Historique N-2
            </button>
          </div>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            EXPORTER PDF
          </button>
        </div>
      </div>

      {viewMode === 'history' ? (
        /* ── 📊 MODE HISTORIQUE N vs N-1 vs N-2 ── */
        <div className="fade-in space-y-6">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800 }}>Analyse Graphique des Tendances (3 ans)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.80rem', margin: '0 0 20px 0' }}>
              Visualisation pluriannuelle de l'équilibre financier (Fonds de Roulement, Besoin en FR, Trésorerie Nette).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              {/* Ajustement Manuel de N-2 */}
              <div style={{ background: 'var(--surface-alt)', padding: 18, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>tune</span>
                  Ajuster l'Exercice N-2
                </span>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>FRNG N-2 :</span>
                    <span className="mono" style={{ fontWeight: 800 }}>{fmt(frngN2)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(0, frngN2 * 0.5)}
                    max={Math.max(frngN2 * 1.8, 1000000)}
                    value={frngN2}
                    onChange={e => setFrngN2(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#1b6e8c' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>BFR N-2 :</span>
                    <span className="mono" style={{ fontWeight: 800 }}>{fmt(bfrN2)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(0, bfrN2 * 0.5)}
                    max={Math.max(bfrN2 * 1.8, 1000000)}
                    value={bfrN2}
                    onChange={e => setBfrN2(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#d97706' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Trésorerie Nette N-2 :</span>
                    <span className="mono" style={{ fontWeight: 800 }}>{fmt(tnN2)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(0, tnN2 * 0.5)}
                    max={Math.max(tnN2 * 1.8, 1000000)}
                    value={tnN2}
                    onChange={e => setTnN2(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#059669' }}
                  />
                </div>
              </div>

              {/* Graphique de Tendances */}
              <div style={{ minHeight: 240, flex: 1, padding: 10, border: '1px solid var(--border)', borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { year: 'N-2', FRNG: frngN2, BFR: bfrN2, 'Trésorerie Nette': tnN2 },
                      { year: 'N-1', FRNG: hasN1 ? dataN1.bilan.frng : data.frng * 0.9, BFR: hasN1 ? dataN1.bilan.bfr : data.bfr * 0.9, 'Trésorerie Nette': hasN1 ? dataN1.bilan.tn : data.tn * 0.9 },
                      { year: 'N', FRNG: data.frng, BFR: data.bfr, 'Trésorerie Nette': data.tn }
                    ]}
                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" style={{ fontSize: '0.7rem' }} />
                    <YAxis style={{ fontSize: '0.7rem' }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: '0.74rem' }} />
                    <Line type="monotone" dataKey="FRNG" stroke="#1b6e8c" strokeWidth={3} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="BFR" stroke="#d97706" strokeWidth={3} />
                    <Line type="monotone" dataKey="Trésorerie Nette" stroke="#059669" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tableau de synthèse 3 ans */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>INDICATEUR DE STRUCTURE</th>
                    <th className="right">EXERCICE N-2</th>
                    <th className="right">EXERCICE N-1</th>
                    <th className="right">EXERCICE N (ACTUEL)</th>
                    <th className="right">VARIATION GLOBALE</th>
                    <th className="right">TENDANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Fonds de Roulement (FRNG)', valN2: frngN2, valN1: hasN1 ? dataN1.bilan.frng : data.frng * 0.9, valN: data.frng, color: '#1b6e8c' },
                    { label: 'Besoin en FR (BFR)', valN2: bfrN2, valN1: hasN1 ? dataN1.bilan.bfr : data.bfr * 0.9, valN: data.bfr, color: '#d97706' },
                    { label: 'Trésorerie Nette (TN)', valN2: tnN2, valN1: hasN1 ? dataN1.bilan.tn : data.tn * 0.9, valN: data.tn, color: '#059669' }
                  ].map((item, idx) => {
                    const diffGlobal = item.valN - item.valN2;
                    const pctGlobal = item.valN2 !== 0 ? (diffGlobal / Math.abs(item.valN2)) * 100 : 0;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: item.color }}>{item.label}</td>
                        <td className="right mono">{fmt(item.valN2)}</td>
                        <td className="right mono">{fmt(item.valN1)}</td>
                        <td className="right mono" style={{ fontWeight: 800 }}>{fmt(item.valN)}</td>
                        <td className="right mono" style={{ color: diffGlobal >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                          {diffGlobal > 0 ? '+' : ''}{fmt(diffGlobal)}
                        </td>
                        <td className="right mono" style={{ color: diffGlobal >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                          {fmtPct(pctGlobal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ── 📊 MODE NORMAL (KPI CARDS & DETAILED TABLES) ── */
        <>
          {/* KPI Cards */}
          <div className="grid-3">
            {[
              { label: 'FRNG', sub: 'Fonds de Roulement Net Global', value: data.frng, valN1: dataN1?.bilan?.frng, good: data.frng >= 0, icon: 'account_balance_wallet', tag: data.frng >= 0 ? 'Excédent' : 'Déficit', color: data.frng >= 0 ? '#059669' : '#dc2626', status: data.frng >= 0 ? 'kpi-good' : 'kpi-bad' },
              { label: 'BFR', sub: 'Besoin en Fonds de Roulement', value: data.bfr, valN1: dataN1?.bilan?.bfr, good: true, icon: 'sync_alt', tag: 'Besoin', color: '#d97706', status: 'kpi-warning' },
              { label: 'Trésorerie Nette', sub: 'Disponibilités réelles', value: data.tn, valN1: dataN1?.bilan?.tn, good: data.tn >= 0, icon: 'payments', tag: data.tn >= 0 ? 'Solide' : 'Tension', color: data.tn >= 0 ? '#1b6e8c' : '#dc2626', status: data.tn >= 0 ? 'kpi-good' : 'kpi-bad' },
            ].map((k, i) => (
              <div key={i} className={`kpi-card ${k.status}`} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span className="kpi-label">{k.label}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: k.color, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{k.good ? 'trending_up' : 'warning'}</span>
                    {k.tag}
                  </span>
                </div>
                <div className="kpi-value" style={{ color: k.color }}>{fmt(k.value)}</div>
                {hasN1 && k.valN1 !== undefined && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    N-1: <strong>{fmt(k.valN1)}</strong> ({fmtPct(k.valN1 ? ((k.value - k.valN1) / Math.abs(k.valN1)) * 100 : 0)})
                  </div>
                )}
                <div style={{ marginTop: 4, fontSize: '0.74rem', color: 'var(--text-sub)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <h3>Décomposition du Bilan Fonctionnel</h3>
              <span className="badge badge-blue">
                {isComparative ? '📊 Comparatif Exercice N vs N-1' : 'Exercice N'}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>POSTE DU BILAN</th>
                    <th className="right">EXERCICE N</th>
                    {isComparative && <th className="right">EXERCICE N-1</th>}
                    {isComparative && <th className="right">ÉVOLUTION</th>}
                    {isComparative && <th className="right">VAR. (%)</th>}
                    <th style={{ width: '80px', textAlign: 'center' }}>DÉTAIL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#f0f8fa' }}>
                    <td colSpan={isComparative ? 6 : 3} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0b3446' }}>I. ACTIF (EMPLOIS)</td>
                  </tr>
                  {[
                    { label: 'Emplois Stables (Immobilisations brut)', val: data.emploisStables, valN1: dataN1?.bilan?.emploisStables, prefixes: ['2'], exclude: ['28', '29'] },
                    { label: 'Actif Circulant (Stocks + Créances)', val: data.actifCirculant, valN1: dataN1?.bilan?.actifCirculant, prefixes: ['3', '4'], exclude: ['40', '419', '39', '49'] },
                    { label: 'Trésorerie Active (Caisse & Banques)', val: data.tresorerieActive, valN1: dataN1?.bilan?.tresorerieActive, prefixes: ['5'], exclude: ['519', '59'], color: '#059669' },
                  ].map((r, i) => {
                    const diff = (r.val || 0) - (r.valN1 || 0);
                    const pct  = r.valN1 ? (diff / Math.abs(r.valN1)) * 100 : 0;
                    return (
                      <tr key={i} onClick={() => openDrillDown(r.label, r.prefixes, r.exclude)} style={{ cursor: 'pointer' }}>
                        <td style={{ paddingLeft: 32, fontWeight: 600 }}>{r.label}</td>
                        <td className="right" style={{ color: r.color || 'var(--text)', fontWeight: 700 }}>{fmt(r.val)}</td>
                        {isComparative && <td className="right mono">{fmt(r.valN1)}</td>}
                        {isComparative && <td className="right mono" style={{ color: diff >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{diff > 0 ? '+' : ''}{fmt(diff)}</td>}
                        {isComparative && <td className="right mono" style={{ color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPct(pct)}</td>}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem', cursor: 'pointer' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>visibility</span> Voir
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#f0fdf4' }}>
                    <td colSpan={isComparative ? 6 : 3} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#14532d' }}>II. PASSIF (RESSOURCES)</td>
                  </tr>
                  {[
                    { label: 'Ressources Stables (Capitaux Propres + Amort. + Dettes LT)', val: data.ressourcesStables, valN1: dataN1?.bilan?.ressourcesStables, prefixes: ['1', '28', '29'] },
                    { label: 'Passif Circulant (Dettes Fournisseurs & Fiscales)', val: data.passifCirculant, valN1: dataN1?.bilan?.passifCirculant, prefixes: ['40', '419', '42', '43', '44'] },
                    { label: 'Trésorerie Passive (Concours bancaires)', val: data.tresoreriePassive, valN1: dataN1?.bilan?.tresoreriePassive, prefixes: ['519'], color: '#dc2626' },
                  ].map((r, i) => {
                    const diff = (r.val || 0) - (r.valN1 || 0);
                    const pct  = r.valN1 ? (diff / Math.abs(r.valN1)) * 100 : 0;
                    return (
                      <tr key={i} onClick={() => openDrillDown(r.label, r.prefixes, r.exclude)} style={{ cursor: 'pointer' }}>
                        <td style={{ paddingLeft: 32, fontWeight: 600 }}>{r.label}</td>
                        <td className="right" style={{ color: r.color || 'var(--text)', fontWeight: 700 }}>{fmt(r.val)}</td>
                        {isComparative && <td className="right mono">{fmt(r.valN1)}</td>}
                        {isComparative && <td className="right mono" style={{ color: diff <= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{diff > 0 ? '+' : ''}{fmt(diff)}</td>}
                        {isComparative && <td className="right mono" style={{ color: diff <= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPct(pct)}</td>}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem', cursor: 'pointer' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>visibility</span> Voir
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#124f66' }}>TOTAL BILAN (ACTIF / PASSIF)</td>
                    <td className="right" style={{ color: '#124f66', fontSize: '1rem' }}>{fmt(totalActifN)}</td>
                    {isComparative && <td className="right mono">{fmt(totalActifN1)}</td>}
                    {isComparative && <td className="right mono">{fmt(totalActifN - totalActifN1)}</td>}
                    {isComparative && <td className="right mono">{fmtPct(totalActifN1 ? ((totalActifN - totalActifN1) / totalActifN1) * 100 : 0)}</td>}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Equilibrium */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#1b6e8c', fontSize: 20 }}>balance</span>
                Équilibre Financier
              </h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { title: 'FRNG = Ressources Stables − Emplois Stables', val: fmt(data.frng), color: '#1b6e8c', note: data.frng >= 0 ? "Les ressources stables couvrent l'intégralité des emplois stables, générant un surplus de sécurité." : "Les emplois stables dépassent les ressources stables, créant un déficit de structure." },
                { title: 'BFR = Actif Circulant − Passif Circulant', val: fmt(data.bfr), color: 'var(--text)', note: "Décalage de trésorerie entre le paiement des fournisseurs et l'encaissement des ventes." },
                { title: 'TN = FRNG − BFR', val: fmt(data.tn), color: '#1b6e8c', note: data.tn >= 0 ? "L'excédent du FRNG est suffisant pour financer le BFR, laissant une trésorerie disponible." : "Le BFR absorbe tout le FRNG et nécessite des concours bancaires de court terme.", blue: true },
              ].map((item, i) => (
                <div key={i} style={{ padding: '14px 18px', borderRadius: 10, border: `1px solid ${item.blue ? '#b7dce6' : 'var(--border)'}`, background: item.blue ? '#f0f8fa' : 'var(--surface-alt)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: item.blue ? '#124f66' : 'var(--text-muted)' }}>{item.title}</span>
                    <span className="mono" style={{ fontWeight: 800, fontSize: '0.92rem', color: item.color }}>{item.val}</span>
                  </div>
                  <p style={{ fontSize: '0.80rem', color: item.blue ? '#124f66' : 'var(--text-muted)' }}>{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Account Detail Drawer */}
      <AccountDetailDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState(prev => ({ ...prev, isOpen: false }))}
        title={drawerState.title}
        accountPrefixes={drawerState.accountPrefixes}
        excludePrefixes={drawerState.excludePrefixes}
        rows={rows}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

