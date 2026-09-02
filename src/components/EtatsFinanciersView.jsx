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
    <div className="card print-avoid-break" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      {/* Légende reprise du modèle officiel "BILAN ACTIF (présentation)" — visible uniquement à
          l'impression, juste au-dessus du tableau (voir .etats-financiers-print .note-col en CSS). */}
      <div className="print-only" style={{ display: 'none', padding: '4px 16px 0', fontSize: '0.7rem' }}>Exercice clos le ..........................</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table official-scf-table">
          <thead>
            <tr>
              <th>ACTIF</th>
              <th className="note-col">Note</th>
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
                    <td colSpan={hasN1 ? 6 : 5} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{r.group}</td>
                  </tr>
                );
              }
              // Sous-groupe purement visuel (ex. "Immobilisations corporelles", "Créances et emplois
              // assimilés") : reproduit le regroupement du modèle officiel BILAN ACTIF (présentation),
              // sans sous-total propre — les montants restent portés par chaque ligne détaillée.
              if (r.subgroup) {
                return (
                  <tr key={i}>
                    <td colSpan={hasN1 ? 6 : 5} style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 2, fontWeight: 700, fontSize: '0.76rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{r.subgroup}</td>
                  </tr>
                );
              }
              const l = r.line || zeroLine;
              const l1 = r.lineN1;
              return (
                <tr key={i} style={r.total ? { background: bandBg } : undefined}>
                  <td style={{ paddingLeft: r.total ? 16 : (r.sub ? 48 : 32), fontWeight: r.total ? 800 : 600, color: r.total ? color : undefined }}>{r.label}</td>
                  <td className="note-col"></td>
                  <td className="right mono" style={{ fontWeight: r.total ? 800 : 500, color: r.total ? color : 'var(--text-muted)' }}>{fmt(l.brut)}</td>
                  <td className="right mono" style={{ color: r.total ? color : 'var(--text-muted)' }}>{l.amortProv ? `(${fmt(l.amortProv)})` : fmt(0)}</td>
                  <td className="right mono" style={{ fontWeight: r.total ? 800 : 600, color: r.total ? color : 'var(--text)' }}>{fmt(l.net)}</td>
                  {hasN1 && <td className="right mono" style={{ color: r.total ? color : undefined }}>{fmt(l1?.net)}</td>}
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
    <div className="card print-avoid-break" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="print-only" style={{ display: 'none', padding: '4px 16px 0', fontSize: '0.7rem' }}>Exercice clos le ..........................</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table official-scf-table">
          <thead>
            <tr>
              <th>PASSIF</th>
              <th className="note-col">Note</th>
              <th className="right">EXERCICE N</th>
              {hasN1 && <th className="right">EXERCICE N-1</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              if (r.group) {
                return (
                  <tr key={i} style={{ background: bandBg }}>
                    <td colSpan={hasN1 ? 4 : 3} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{r.group}</td>
                  </tr>
                );
              }
              return (
                <tr key={i} style={r.total ? { background: bandBg } : undefined}>
                  <td style={{ paddingLeft: r.total ? 16 : 32, fontWeight: r.total ? 800 : 600, color: r.total ? color : undefined }}>{r.label}</td>
                  <td className="note-col"></td>
                  <td className="right mono" style={{ fontWeight: r.total ? 800 : 600, color: r.total ? color : 'var(--text)' }}>{fmt(r.val)}</td>
                  {hasN1 && <td className="right mono" style={{ color: r.total ? color : undefined }}>{fmt(r.valN1)}</td>}
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
  // Les montants des tableaux s'affichent sans le suffixe de devise (répété inutilement sur
  // chaque ligne) — seule la bannière d'équilibre Actif/Passif garde la devise complète.
  const decimals = profil?.rounding ?? 0;
  const fmtNum = (v) => {
    const num = Number(v) || 0;
    const sign = num < 0 ? '-' : '';
    const [intPart, decPart] = Math.abs(num).toFixed(decimals).split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sign}${formattedInt}${decPart ? ',' + decPart : ''}`;
  };

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
    { subgroup: 'Immobilisations corporelles' },
    { label: 'Terrains', line: an.terrains, lineN1: an1?.terrains, sub: true },
    { label: 'Bâtiments', line: an.batiments, lineN1: an1?.batiments, sub: true },
    { label: 'Autres immobilisations corporelles', line: an.autresImmoCorp, lineN1: an1?.autresImmoCorp, sub: true },
    { label: 'Immobilisations en concession', line: an.immobilisationsEnConcession, lineN1: an1?.immobilisationsEnConcession, sub: true },
    { label: 'Immobilisations en cours', line: an.immobilisationsEnCours, lineN1: an1?.immobilisationsEnCours },
    { label: 'Immobilisations financières', line: an.immobilisationsFinancieres, lineN1: an1?.immobilisationsFinancieres },
    { label: 'Impôts différés actif', line: an.impotsDifferesActif, lineN1: an1?.impotsDifferesActif },
    { label: 'TOTAL ACTIF NON COURANT', line: ancTotalLine, lineN1: ancTotalLineN1, total: true },
    { group: 'ACTIF COURANT' },
    { label: 'Stocks et encours', line: ac.stocks, lineN1: ac1?.stocks },
    { subgroup: 'Créances et emplois assimilés' },
    { label: 'Clients', line: ac.clients, lineN1: ac1?.clients, sub: true },
    { label: 'Autres débiteurs', line: ac.autresDebiteurs, lineN1: ac1?.autresDebiteurs, sub: true },
    { label: 'Impôts et assimilés', line: ac.impotsEtAssimilesActif, lineN1: ac1?.impotsEtAssimilesActif, sub: true },
    { label: 'Autres créances et emplois assimilés', line: ac.autresCreancesEmploisAssimiles, lineN1: ac1?.autresCreancesEmploisAssimiles, sub: true },
    { subgroup: 'Disponibilités et assimilés' },
    { label: 'Placements et autres actifs financiers courants', line: ac.placements, lineN1: ac1?.placements, sub: true },
    { label: 'Trésorerie', line: ac.tresorerie, lineN1: ac1?.tresorerie, sub: true },
    { label: 'TOTAL ACTIF COURANT', line: acTotalLine, lineN1: acTotalLineN1, total: true },
  ];

  const passifRows = [
    { group: 'CAPITAUX PROPRES' },
    { label: 'Capital émis', val: cp.capitalEmis, valN1: cp1?.capitalEmis },
    { label: 'Capital non appelé (-)', val: cp.capitalNonAppele, valN1: cp1?.capitalNonAppele },
    { label: 'Primes et réserves', val: cp.primesEtReserves, valN1: cp1?.primesEtReserves },
    { label: 'Écarts de réévaluation', val: cp.ecartsReevaluation, valN1: cp1?.ecartsReevaluation },
    { label: 'Résultat net', val: cp.resultatNet, valN1: cp1?.resultatNet },
    { label: 'Résultat en instance d\'affectation', val: cp.resultatEnInstance, valN1: cp1?.resultatEnInstance },
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
        <div style={{ fontSize: '0.85rem' }}>Date d'édition : {new Date().toLocaleDateString('fr-FR')}</div>
      </div>

      {/* Un bilan équilibré n'a pas besoin d'imprimer son bandeau de contrôle ; un bilan
          DÉSÉQUILIBRÉ, si — c'est précisément au moment où l'état part chez un tiers
          (banque, associé, administration) que l'avertissement doit rester visible. */}
      <div className={`card ${equilibre ? 'no-print' : ''}`} style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: equilibre ? '#f0fdf4' : '#fef2f2', border: `1px solid ${equilibre ? '#bbf7d0' : '#fecaca'}` }}>
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
      <ActifSection title="BILAN — ACTIF" color="#0b3446" bandBg="#f0f8fa" rows={actifRows} fmt={fmtNum} hasN1={hasN1} />

      <div className="section-title print-title" style={{ display: 'none' }}>BILAN PASSIF</div>
      <PassifSection title="BILAN — PASSIF" color="#14532d" bandBg="#f0fdf4" rows={passifRows} fmt={fmtNum} hasN1={hasN1} />

      <div className="section-title print-title" style={{ display: 'none' }}>COMPTE DE RÉSULTATS (par nature)</div>
      <div className="card print-avoid-break" style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <h3>Compte de Résultat par Nature (TCR officiel)</h3>
        </div>
        <div className="print-only" style={{ display: 'none', padding: '4px 16px 0', fontSize: '0.7rem' }}>Période du .......................... au ..........................</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table official-scf-table">
            <thead>
              <tr>
                <th>RUBRIQUE</th>
                <th>CODE</th>
                <th className="note-col">Note</th>
                <th className="right">MONTANT N</th>
              </tr>
            </thead>
            <tbody>
              {tcrRows.map((r, i) => {
                const isTotalRow = r.type !== 'compte';
                return (
                  <tr key={i} style={isTotalRow ? { background: '#f0f8fa' } : undefined}>
                    <td style={{ fontWeight: isTotalRow ? 800 : 500, textTransform: isTotalRow ? 'uppercase' : 'none', fontSize: isTotalRow ? '0.78rem' : '0.85rem', color: isTotalRow ? '#124f66' : undefined }}>{r.label}</td>
                    <td className="mono" style={{ fontWeight: isTotalRow ? 800 : 600, color: isTotalRow ? '#124f66' : 'var(--text)' }}>{r.code}</td>
                    <td className="note-col"></td>
                    <td className="right mono" style={{ fontWeight: isTotalRow ? 800 : 600, color: isTotalRow ? '#124f66' : (r.isCharge ? 'var(--red)' : 'var(--text)') }}>
                      {r.isCharge && r.val > 0 ? `(${fmtNum(r.val)})` : fmtNum(r.val)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
