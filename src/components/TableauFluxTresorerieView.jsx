import { calculateTFT } from '../utils/financeCalculations';
import { EmptyState } from './EmptyState';

// `val` doit toujours être la CONTRIBUTION SIGNÉE réelle de la ligne au sous-total (ce qu'on
// additionnerait littéralement pour obtenir le total) — jamais une simple variation de solde
// brute. Un montant négatif s'affiche entre parenthèses, convention standard des états financiers.
function Ligne({ label, val, fmt, total, indent }) {
  const isNeg = val < 0;
  return (
    <tr style={total ? { background: '#f0f8fa' } : undefined}>
      <td style={{ paddingLeft: indent ? 32 : 16, fontWeight: total ? 800 : 600, color: total ? '#124f66' : 'var(--text)' }}>{label}</td>
      <td className="right mono" style={{ fontWeight: total ? 800 : 600, color: total ? '#124f66' : (isNeg ? 'var(--red)' : 'var(--text)') }}>
        {isNeg ? `(${fmt(Math.abs(val))})` : fmt(val)}
      </td>
    </tr>
  );
}

export function TableauFluxTresorerieView({ data, formatCurrency, profil }) {
  const fmt = (v) => formatCurrency ? formatCurrency(v) : (v || 0).toLocaleString('fr-FR');

  if (!data || !data.bilan || !data.sig) {
    return (
      <EmptyState icon="waterfall_chart" title="Tableau des Flux de Trésorerie non disponible" message="Veuillez importer une balance comptable." maxWidth={420} />
    );
  }

  const tft = calculateTFT(data);
  const nomEntreprise = profil?.nomEntreprise || 'Dossier Anonyme';

  if (!tft.hasN1) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
        <div>
          <div className="section-title">Tableau des Flux de Trésorerie (TFT)</div>
          <div className="section-sub" style={{ marginBottom: 0 }}>
            Méthode indirecte, conforme au Système Comptable Financier (Loi 07-11, Décret 08-156).
          </div>
        </div>
        <div className="card" style={{ maxWidth: 560, margin: '20px auto', textAlign: 'center', padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 44, color: 'var(--primary)', marginBottom: 12, display: 'block' }}>waterfall_chart</span>
          <h3 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 8 }}>Exercice N-1 requis</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.90rem' }}>
            Le Tableau des Flux de Trésorerie mesure la <strong>variation</strong> de trésorerie entre deux exercices — il nécessite la balance de l'exercice précédent (N-1) en plus de celle de l'exercice N. Importez-la depuis l'onglet Importation pour l'activer.
          </p>
        </div>
      </div>
    );
  }

  const { activite, investissement, financement, variationTresorerie, tresorerieOuverture, tresorerieClotureTheorique, tresorerieClotureReelle, ecartRapprochement } = tft;
  const ecartSignificatif = Math.abs(ecartRapprochement) > Math.max(1, Math.abs(tresorerieClotureReelle) * 0.02);
  const isPositive = variationTresorerie >= 0;

  return (
    <div className="fade-in etats-financiers-print" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }} className="no-print">
        <div>
          <div className="section-title">Tableau des Flux de Trésorerie (TFT)</div>
          <div className="section-sub" style={{ marginBottom: 0 }}>
            Méthode indirecte — conforme au Système Comptable Financier (Loi 07-11, Décret 08-156). La méthode directe du modèle officiel nécessite un journal détaillé, non disponible à partir d'une balance.
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

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }} className="no-print">
        <div className="card" style={{ padding: '14px 18px', background: activite.total >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${activite.total >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: activite.total >= 0 ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>Flux Activité (A)</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 900, color: activite.total >= 0 ? '#166534' : '#991b1b' }}>{fmt(activite.total)}</div>
        </div>
        <div className="card" style={{ padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#124f66', textTransform: 'uppercase' }}>Flux Investissement (B)</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 900, color: '#124f66' }}>{fmt(investissement.total)}</div>
        </div>
        <div className="card" style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>Flux Financement (C)</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 900, color: '#92400e' }}>{fmt(financement.total)}</div>
        </div>
        <div className="card" style={{ padding: '14px 18px', background: isPositive ? '#e0f2ff' : '#fef2f2', border: `1px solid ${isPositive ? '#8fc6d6' : '#fecaca'}` }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: isPositive ? '#0b3446' : '#991b1b', textTransform: 'uppercase' }}>Variation Nette (A+B+C)</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 900, color: isPositive ? '#0b3446' : '#991b1b' }}>{isPositive ? '+' : ''}{fmt(variationTresorerie)}</div>
        </div>
      </div>

      {/* ── TABLEAU DÉTAILLÉ ── */}
      <div className="card print-avoid-break" style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <h3>Tableau des Flux de Trésorerie — Méthode Indirecte</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>RUBRIQUE</th>
                <th className="right">MONTANT N</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f0f8fa' }}>
                <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0b3446' }}>A. FLUX DE TRÉSORERIE LIÉS À L'ACTIVITÉ</td>
              </tr>
              <Ligne label="Capacité d'Autofinancement (CAF)" val={activite.caf} fmt={fmt} indent />
              <Ligne label="Variation du Besoin en Fonds de Roulement (BFR)" val={-activite.variationBFR} fmt={fmt} indent />
              <Ligne label="FLUX NET DE TRÉSORERIE LIÉ À L'ACTIVITÉ (A)" val={activite.total} fmt={fmt} total />

              <tr style={{ background: '#f0f8fa' }}>
                <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0b3446' }}>B. FLUX DE TRÉSORERIE LIÉS AUX OPÉRATIONS D'INVESTISSEMENT</td>
              </tr>
              <Ligne label="Acquisitions / Cessions d'immobilisations (variation brute)" val={-investissement.variationImmo} fmt={fmt} indent />
              <Ligne label="FLUX NET DE TRÉSORERIE LIÉ AUX INVESTISSEMENTS (B)" val={investissement.total} fmt={fmt} total />

              <tr style={{ background: '#f0f8fa' }}>
                <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0b3446' }}>C. FLUX DE TRÉSORERIE LIÉS AUX OPÉRATIONS DE FINANCEMENT</td>
              </tr>
              <Ligne label="Augmentation de capital / apports" val={financement.augmentationCapital} fmt={fmt} indent />
              <Ligne label="Emprunts souscrits / remboursés (variation nette)" val={financement.variationDette} fmt={fmt} indent />
              <Ligne label="Dividendes versés (estimation)" val={-financement.dividendesVerses} fmt={fmt} indent />
              <Ligne label="FLUX NET DE TRÉSORERIE LIÉ AU FINANCEMENT (C)" val={financement.total} fmt={fmt} total />

              <tr style={{ background: '#f0f8fa' }}>
                <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#124f66' }}>SYNTHÈSE</td>
              </tr>
              <Ligne label="VARIATION DE TRÉSORERIE DE LA PÉRIODE (A + B + C)" val={variationTresorerie} fmt={fmt} total />
              <Ligne label="Trésorerie Nette à l'Ouverture (N-1)" val={tresorerieOuverture} fmt={fmt} indent />
              <Ligne label="Trésorerie Nette de Clôture Théorique (Ouverture + Variation)" val={tresorerieClotureTheorique} fmt={fmt} indent />
              {ecartSignificatif && (
                <Ligne label="Écart de rapprochement (mouvements de capitaux propres non détaillés — écarts de réévaluation, subventions...)" val={ecartRapprochement} fmt={fmt} indent />
              )}
              <Ligne label="Trésorerie Nette de Clôture Réelle (Bilan Fonctionnel)" val={tresorerieClotureReelle} fmt={fmt} total />
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 20px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>Méthode indirecte :</strong> le flux d'activité part de la Capacité d'Autofinancement (CAF), déjà calculée selon la méthode soustractive SCF, retraitée de la variation du Besoin en Fonds de Roulement. Les flux d'investissement et de financement sont dérivés des variations du Bilan entre N et N-1. Contrairement à la méthode directe du modèle officiel (qui détaille les encaissements/décaissements réels compte par compte), cette approche ne nécessite pas le journal détaillé des écritures — uniquement les balances N et N-1.
          </p>
        </div>
      </div>
    </div>
  );
}
