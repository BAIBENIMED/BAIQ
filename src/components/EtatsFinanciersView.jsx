import { buildTCRRows } from '../utils/financeCalculations';
import { EmptyState } from './EmptyState';

const zeroLine = { brut: 0, amortProv: 0, net: 0 };

function sumLines(lines) {
  return lines.reduce((s, l) => ({ brut: s.brut + (l?.brut || 0), amortProv: s.amortProv + (l?.amortProv || 0), net: s.net + (l?.net || 0) }), { brut: 0, amortProv: 0, net: 0 });
}

// Tableau ACTIF au format officiel SCF : Note | N Brut | N Amort-Prov | N Net | N-1 Net
// (voir "BILAN ACTIF (présentation)", arrêté du 26/07/2008).
function ActifSection({ title, color, bandBg, rows, fmt, hasN1 }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>RUBRIQUE</th>
              <th className="right">BRUT N</th>
              <th className="right">AMORT./PROV.</th>
              <th className="right">NET N</th>
              {hasN1 && <th className="right">NET N-1</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              if (r.group) {
                return (
                  <tr key={i} style={{ background: bandBg }}>
                    <td colSpan={hasN1 ? 5 : 4} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{r.group}</td>
                  </tr>
                );
              }
              const l = r.line || zeroLine;
              const l1 = r.lineN1;
              return (
                <tr key={i}>
                  <td style={{ paddingLeft: r.total ? 16 : 32, fontWeight: r.total ? 800 : 600 }}>{r.label}</td>
                  <td className="right mono" style={{ fontWeight: r.total ? 800 : 500, color: r.total ? color : 'var(--text-muted)' }}>{fmt(l.brut)}</td>
                  <td className="right mono" style={{ color: 'var(--text-muted)' }}>{l.amortProv ? `(${fmt(l.amortProv)})` : fmt(0)}</td>
                  <td className="right mono" style={{ fontWeight: r.total ? 800 : 600, color: r.total ? color : 'var(--text)' }}>{fmt(l.net)}</td>
                  {hasN1 && <td className="right mono">{fmt(l1?.net)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tableau PASSIF au format officiel SCF : Note | N | N-1 (pas de colonne Brut/Amort-Prov,
// voir "BILAN PASSIF (présentation)").
function PassifSection({ title, color, bandBg, rows, fmt, hasN1 }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>RUBRIQUE</th>
              <th className="right">EXERCICE N</th>
              {hasN1 && <th className="right">EXERCICE N-1</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              if (r.group) {
                return (
                  <tr key={i} style={{ background: bandBg }}>
                    <td colSpan={hasN1 ? 3 : 2} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{r.group}</td>
                  </tr>
                );
              }
              return (
                <tr key={i}>
                  <td style={{ paddingLeft: r.total ? 16 : 32, fontWeight: r.total ? 800 : 600 }}>{r.label}</td>
                  <td className="right mono" style={{ fontWeight: r.total ? 800 : 600, color: r.total ? color : 'var(--text)' }}>{fmt(r.val)}</td>
                  {hasN1 && <td className="right mono">{fmt(r.valN1)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EtatsFinanciersView({ data, sig, dataN1, profil, formatCurrency }) {
  const fmt = (v) => formatCurrency ? formatCurrency(v) : (v || 0).toLocaleString('fr-FR');

  if (!data || !sig) return (
    <EmptyState icon="summarize" title="États financiers non disponibles" message="Veuillez importer une balance comptable." maxWidth={420} />
  );

  const n1 = dataN1?.bilanSCF || null;
  const hasN1 = !!n1;
  const an = data.actifNonCourant, ac = data.actifCourant;
  const an1 = n1?.actifNonCourant, ac1 = n1?.actifCourant;
  const cp = data.capitauxPropres, pnc = data.passifNonCourant, pc = data.passifCourant;
  const cp1 = n1?.capitauxPropres, pnc1 = n1?.passifNonCourant, pc1 = n1?.passifCourant;

  const ancTotalLine = sumLines(Object.keys(an).filter(k => k !== 'total').map(k => an[k]));
  const ancTotalLineN1 = an1 ? sumLines(Object.keys(an1).filter(k => k !== 'total').map(k => an1[k])) : null;
  const acTotalLine = sumLines(Object.keys(ac).filter(k => k !== 'total').map(k => ac[k]));
  const acTotalLineN1 = ac1 ? sumLines(Object.keys(ac1).filter(k => k !== 'total').map(k => ac1[k])) : null;

  const actifRows = [
    { group: 'ACTIF NON COURANT' },
    { label: 'Écart d\'acquisition (goodwill)', line: an.ecartAcquisition, lineN1: an1?.ecartAcquisition },
    { label: 'Immobilisations incorporelles', line: an.immobilisationsIncorporelles, lineN1: an1?.immobilisationsIncorporelles },
    { label: 'Terrains', line: an.terrains, lineN1: an1?.terrains },
    { label: 'Bâtiments', line: an.batiments, lineN1: an1?.batiments },
    { label: 'Autres immobilisations corporelles', line: an.autresImmoCorp, lineN1: an1?.autresImmoCorp },
    { label: 'Immobilisations en concession', line: an.immobilisationsEnConcession, lineN1: an1?.immobilisationsEnConcession },
    { label: 'Immobilisations en cours', line: an.immobilisationsEnCours, lineN1: an1?.immobilisationsEnCours },
    { label: 'Immobilisations financières', line: an.immobilisationsFinancieres, lineN1: an1?.immobilisationsFinancieres },
    { label: 'Impôts différés actif', line: an.impotsDifferesActif, lineN1: an1?.impotsDifferesActif },
    { label: 'TOTAL ACTIF NON COURANT', line: ancTotalLine, lineN1: ancTotalLineN1, total: true },
    { group: 'ACTIF COURANT' },
    { label: 'Stocks et en-cours', line: ac.stocks, lineN1: ac1?.stocks },
    { label: 'Clients', line: ac.clients, lineN1: ac1?.clients },
    { label: 'Autres débiteurs', line: ac.autresDebiteurs, lineN1: ac1?.autresDebiteurs },
    { label: 'Impôts et assimilés', line: ac.impotsEtAssimilesActif, lineN1: ac1?.impotsEtAssimilesActif },
    { label: 'Autres créances et emplois assimilés', line: ac.autresCreancesEmploisAssimiles, lineN1: ac1?.autresCreancesEmploisAssimiles },
    { label: 'Placements et autres actifs financiers courants', line: ac.placements, lineN1: ac1?.placements },
    { label: 'Trésorerie', line: ac.tresorerie, lineN1: ac1?.tresorerie },
    { label: 'TOTAL ACTIF COURANT', line: acTotalLine, lineN1: acTotalLineN1, total: true },
  ];

  const passifRows = [
    { group: 'CAPITAUX PROPRES' },
    { label: 'Capital émis', val: cp.capitalEmis, valN1: cp1?.capitalEmis },
    { label: 'Capital non appelé (-)', val: cp.capitalNonAppele, valN1: cp1?.capitalNonAppele },
    { label: 'Primes et réserves', val: cp.primesEtReserves, valN1: cp1?.primesEtReserves },
    { label: 'Écarts de réévaluation', val: cp.ecartsReevaluation, valN1: cp1?.ecartsReevaluation },
    { label: 'Résultat net', val: cp.resultatNet, valN1: cp1?.resultatNet },
    { label: 'Autres capitaux propres — Report à nouveau', val: cp.autresCapitauxPropres, valN1: cp1?.autresCapitauxPropres },
    { label: 'TOTAL I — CAPITAUX PROPRES', val: cp.total, valN1: cp1?.total, total: true },
    { group: 'PASSIFS NON COURANTS' },
    { label: 'Emprunts et dettes financières', val: pnc.empruntsDettesFinancieres, valN1: pnc1?.empruntsDettesFinancieres },
    { label: 'Impôts (différés et provisionnés)', val: pnc.impotsDifferesPassif, valN1: pnc1?.impotsDifferesPassif },
    { label: 'Autres dettes non courantes', val: pnc.autresDettesNonCourantes, valN1: pnc1?.autresDettesNonCourantes },
    { label: 'Provisions et produits constatés d\'avance', val: pnc.provisionsEtProduitsConstatesAvance, valN1: pnc1?.provisionsEtProduitsConstatesAvance },
    { label: 'TOTAL II — PASSIFS NON COURANTS', val: pnc.total, valN1: pnc1?.total, total: true },
    { group: 'PASSIFS COURANTS' },
    { label: 'Fournisseurs et comptes rattachés', val: pc.fournisseurs, valN1: pc1?.fournisseurs },
    { label: 'Impôts', val: pc.impotsEtAssimilesPassif, valN1: pc1?.impotsEtAssimilesPassif },
    { label: 'Autres dettes', val: pc.autresDettes, valN1: pc1?.autresDettes },
    { label: 'Trésorerie passif', val: pc.tresoreriePassif, valN1: pc1?.tresoreriePassif },
    { label: 'TOTAL III — PASSIFS COURANTS', val: pc.total, valN1: pc1?.total, total: true },
  ];

  const ecart = data.totalActif - data.totalPassif;
  const equilibre = Math.abs(ecart) < 1;

  const tcrRows = buildTCRRows(sig);
  const nomEntreprise = profil?.nomEntreprise || 'Dossier Anonyme';

  return (
    <div className="fade-in etats-financiers-print" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }} className="no-print">
        <div>
          <div className="section-title">États Financiers Officiels (SCF)</div>
          <div className="section-sub" style={{ marginBottom: 0 }}>
            Bilan (Actif/Passif) et Compte de Résultat par Nature, conformes aux modèles fixés par l'arrêté du 26 juillet 2008 (Système Comptable Financier — Loi 07-11, Décret 08-156).
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span>
          IMPRIMER
        </button>
      </div>

      <div className="print-only" style={{ display: 'none', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{nomEntreprise}</div>
        <div style={{ fontSize: '0.85rem' }}>États financiers établis selon le Système Comptable Financier (Loi 07-11, Décret 08-156, arrêté du 26/07/2008) — Exercice clos le {new Date().toLocaleDateString('fr-FR')}</div>
      </div>

      <div className="card no-print" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: equilibre ? '#f0fdf4' : '#fef2f2', border: `1px solid ${equilibre ? '#bbf7d0' : '#fecaca'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: equilibre ? '#059669' : '#dc2626' }}>{equilibre ? 'check_circle' : 'error'}</span>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: equilibre ? '#14532d' : '#7f1d1d' }}>
            {equilibre ? 'Bilan équilibré' : `Écart de balance : ${fmt(ecart)}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: '0.8rem' }}>
          <span>TOTAL ACTIF : <strong className="mono">{fmt(data.totalActif)}</strong></span>
          <span>TOTAL PASSIF : <strong className="mono">{fmt(data.totalPassif)}</strong></span>
        </div>
      </div>

      <div className="section-title print-title" style={{ display: 'none' }}>BILAN ACTIF</div>
      <ActifSection title="BILAN — ACTIF" color="#0b3446" bandBg="#f0f8fa" rows={actifRows} fmt={fmt} hasN1={hasN1} />

      <div className="section-title print-title" style={{ display: 'none' }}>BILAN PASSIF</div>
      <PassifSection title="BILAN — PASSIF" color="#14532d" bandBg="#f0fdf4" rows={passifRows} fmt={fmt} hasN1={hasN1} />

      <div className="section-title print-title" style={{ display: 'none' }}>COMPTE DE RÉSULTATS (par nature)</div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <h3>Compte de Résultat par Nature (TCR officiel)</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>RUBRIQUE</th>
                <th className="right">MONTANT N</th>
              </tr>
            </thead>
            <tbody>
              {tcrRows.map((r, i) => (
                <tr key={i} style={r.type === 'grand-total' ? { background: '#f0f8fa' } : undefined}>
                  <td className="mono" style={{ fontWeight: r.type !== 'compte' ? 800 : 600, color: r.type !== 'compte' ? '#124f66' : 'var(--text)' }}>{r.code}</td>
                  <td style={{ fontWeight: r.type !== 'compte' ? 800 : 500, textTransform: r.type !== 'compte' ? 'uppercase' : 'none', fontSize: r.type !== 'compte' ? '0.78rem' : '0.85rem' }}>{r.label}</td>
                  <td className="right mono" style={{ fontWeight: r.type !== 'compte' ? 800 : 600, color: r.type === 'grand-total' ? '#124f66' : (r.isCharge ? 'var(--red)' : 'var(--text)') }}>
                    {r.isCharge && r.val > 0 ? `(${fmt(r.val)})` : fmt(r.val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
