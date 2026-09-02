/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BAIQ — Invariants comptables des moteurs de calcul
 * ═══════════════════════════════════════════════════════════════════════════
 * Exécution : npm test   (runner intégré de Node, aucune dépendance externe)
 *
 * Ces tests couvrent les invariants qui ne peuvent JAMAIS être faux, quelle que
 * soit la balance importée :
 *   1. Une balance équilibrée produit un bilan SCF équilibré.
 *   2. Les capitaux propres sont identiques dans les trois moteurs
 *      (bilan officiel, ratios, rating bancaire).
 *   3. Des capitaux propres négatifs ne peuvent pas produire un rating flatteur.
 *   4. Un montant estimé n'est jamais présenté comme mesuré.
 *
 * Chaque balance de test est vérifiée équilibrée (Σ débits = Σ crédits) AVANT
 * d'être exploitée : un jeu de test déséquilibré produirait de faux positifs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBilanFonctionnel,
  calculateSIG,
  calculateRatios,
  calculateBilanSCF,
  checkBalanceEquilibre,
  computeCapitauxPropres,
  detectDecimalSeparator,
  safeNum,
} from '../src/utils/financeCalculations.js';
import { calculateAltmanZScore } from '../src/utils/solvabiliteEngine.js';

/** Construit une ligne de balance au format produit par parseFile(). */
const L = (compte, libelle, debit, credit) => ({
  compte, libelle,
  soldeDebutDebit: 0, soldeDebutCredit: 0,
  mouvementDebit: 0, mouvementCredit: 0,
  soldeFinDebit: debit, soldeFinCredit: credit,
  debit, credit, solde: debit - credit,
  isTotal: false, ignore: false,
});

/** Exécute la chaîne complète de calcul sur une balance. */
const analyser = (rows) => {
  const data = { isBalance: true, rows };
  const bilan = calculateBilanFonctionnel(data);
  const sig = calculateSIG(data);
  return {
    bilan, sig,
    ratios: calculateRatios(bilan, sig, rows),
    scf: calculateBilanSCF(data, sig),
    solva: calculateAltmanZScore(bilan, sig, rows),
  };
};

// ── Jeux de balances de référence ──────────────────────────────────────────

/** Entreprise saine, avant clôture (classes 6/7 mouvementées). */
const BALANCE_SAINE = [
  L('213', 'Constructions', 5_000_000, 0),
  L('281', 'Amortissements constructions', 0, 1_000_000),
  L('31', 'Stocks matières', 2_000_000, 0),
  L('411', 'Clients', 1_500_000, 0),
  L('512', 'Banque', 3_000_000, 0),
  L('101', 'Capital social', 0, 3_000_000),
  L('106', 'Réserves', 0, 1_000_000),
  L('164', 'Emprunts bancaires', 0, 2_000_000),
  L('401', 'Fournisseurs', 0, 2_500_000),
  L('421', 'Personnel', 0, 500_000),
  L('444', 'État impôts', 0, 500_000),
  L('601', 'Achats consommés', 6_000_000, 0),
  L('631', 'Charges de personnel', 2_000_000, 0),
  L('661', 'Charges financières', 200_000, 0),
  L('681', 'Dotations aux amortissements', 500_000, 0),
  L('701', 'Ventes de marchandises', 0, 9_700_000),
];

/** Même entreprise, mais avec un résultat antérieur non affecté au compte 12. */
const BALANCE_AVEC_COMPTE_12 = [
  L('213', 'Constructions', 5_000_000, 0),
  L('281', 'Amortissements', 0, 1_000_000),
  L('31', 'Stocks', 2_000_000, 0),
  L('411', 'Clients', 1_500_000, 0),
  L('512', 'Banque', 3_000_000, 0),
  L('101', 'Capital social', 0, 3_000_000),
  L('120', 'Résultat en instance d\'affectation', 0, 1_000_000),
  L('164', 'Emprunts', 0, 2_000_000),
  L('401', 'Fournisseurs', 0, 2_500_000),
  L('421', 'Personnel', 0, 500_000),
  L('444', 'État', 0, 500_000),
  L('601', 'Achats', 6_000_000, 0),
  L('631', 'Charges de personnel', 2_000_000, 0),
  L('661', 'Charges financières', 200_000, 0),
  L('681', 'Dotations', 500_000, 0),
  L('701', 'Ventes', 0, 9_700_000),
];

/** Balance postérieure à la clôture : classes 6/7 soldées, résultat au compte 12. */
const BALANCE_APRES_CLOTURE = [
  L('213', 'Constructions', 5_000_000, 0),
  L('281', 'Amortissements', 0, 1_000_000),
  L('31', 'Stocks', 2_000_000, 0),
  L('411', 'Clients', 1_500_000, 0),
  L('512', 'Banque', 3_000_000, 0),
  L('101', 'Capital social', 0, 3_000_000),
  L('106', 'Réserves', 0, 1_000_000),
  L('120', 'Résultat de l\'exercice', 0, 1_000_000),
  L('164', 'Emprunts', 0, 2_000_000),
  L('401', 'Fournisseurs', 0, 2_500_000),
  L('421', 'Personnel', 0, 500_000),
  L('444', 'État', 0, 500_000),
];

/**
 * Capitaux propres réellement négatifs (pertes reportées supérieures au capital),
 * SANS dette financière LT ni charge financière — le profil qui obtenait
 * auparavant 5/5 sur les critères Autonomie et Couverture du score Banque d'Algérie.
 */
const BALANCE_FONDS_PROPRES_NEGATIFS = [
  L('411', 'Clients', 1_000_000, 0),
  L('512', 'Banque', 500_000, 0),
  L('31', 'Stocks', 500_000, 0),
  L('119', 'Report à nouveau débiteur', 5_000_000, 0),
  L('101', 'Capital social', 0, 1_000_000),
  L('401', 'Fournisseurs', 0, 7_000_000),
  L('601', 'Achats', 5_000_000, 0),
  L('701', 'Ventes', 0, 4_000_000),
];

/** Balance dont la structure de capitaux propres n'est pas détaillée. */
const BALANCE_SANS_CAPITAUX_PROPRES = [
  L('213', 'Constructions', 5_000_000, 0),
  L('31', 'Stocks', 2_000_000, 0),
  L('411', 'Clients', 1_500_000, 0),
  L('512', 'Banque', 1_500_000, 0),
  L('164', 'Emprunts', 0, 6_000_000),
  L('401', 'Fournisseurs', 0, 3_000_000),
  L('601', 'Achats', 4_000_000, 0),
  L('701', 'Ventes', 0, 5_000_000),
];

/** Capitaux propres calculés à exactement zéro à partir de comptes bien présents. */
const BALANCE_CAPITAUX_PROPRES_NULS = [
  L('411', 'Clients', 2_000_000, 0),
  L('512', 'Banque', 1_000_000, 0),
  L('101', 'Capital social', 0, 2_000_000),
  L('119', 'Report à nouveau débiteur', 2_000_000, 0),
  L('401', 'Fournisseurs', 0, 3_000_000),
  L('601', 'Achats', 4_000_000, 0),
  L('701', 'Ventes', 0, 4_000_000),
];

const TOUTES = [
  ['saine', BALANCE_SAINE],
  ['avec compte 12', BALANCE_AVEC_COMPTE_12],
  ['après clôture', BALANCE_APRES_CLOTURE],
  ['fonds propres négatifs', BALANCE_FONDS_PROPRES_NEGATIFS],
  ['capitaux propres nuls', BALANCE_CAPITAUX_PROPRES_NULS],
];

// ── 0. Les jeux de test sont eux-mêmes équilibrés ──────────────────────────

test('les balances de référence respectent la partie double', () => {
  for (const [nom, rows] of TOUTES) {
    const eq = checkBalanceEquilibre(rows);
    assert.equal(eq.equilibre, true,
      `la balance de test « ${nom} » est déséquilibrée (écart ${eq.ecart}) — le test lui-même est invalide`);
  }
});

test('checkBalanceEquilibre détecte un déséquilibre réel', () => {
  const rows = [...BALANCE_SAINE, L('401', 'Fournisseur oublié', 0, 250_000)];
  const eq = checkBalanceEquilibre(rows);
  assert.equal(eq.equilibre, false);
  assert.equal(Math.round(eq.ecart), -250_000);
});

test('checkBalanceEquilibre ignore les lignes de totaux du fichier source', () => {
  const total = { ...L('', 'TOTAL GÉNÉRAL', 20_200_000, 20_200_000), isTotal: true, ignore: true };
  const eq = checkBalanceEquilibre([...BALANCE_SAINE, total]);
  assert.equal(eq.equilibre, true, 'une ligne de total ne doit pas être comptée deux fois');
});

// ── 1. Invariant : bilan SCF équilibré ─────────────────────────────────────

test('une balance équilibrée produit toujours un bilan SCF équilibré', () => {
  for (const [nom, rows] of TOUTES) {
    const { scf } = analyser(rows);
    const ecart = scf.totalActif - scf.totalPassif;
    assert.ok(Math.abs(ecart) < 1,
      `bilan déséquilibré sur la balance « ${nom} » : ACTIF ${scf.totalActif} ≠ PASSIF ${scf.totalPassif} (écart ${ecart})`);
  }
});

test('le compte 12 alimente le résultat quand les classes 6/7 sont absentes', () => {
  const { sig, scf } = analyser(BALANCE_APRES_CLOTURE);
  assert.equal(sig.resultatNet, 0, 'sans classes 6/7, le SIG ne peut pas dégager de résultat');
  assert.equal(scf.capitauxPropres.resultatNet, 1_000_000,
    'le solde du compte 12 doit alors constituer le résultat de l\'exercice');
});

test('le compte 12 et le résultat de l\'exercice se cumulent sans se confondre', () => {
  const { scf } = analyser(BALANCE_AVEC_COMPTE_12);
  assert.equal(scf.capitauxPropres.resultatNet, 1_000_000, 'résultat de l\'exercice (classes 6/7)');
  assert.equal(scf.capitauxPropres.resultatEnInstance, 1_000_000, 'résultat antérieur non affecté (compte 12)');
});

// ── 2. Invariant : capitaux propres identiques dans les trois moteurs ───────

test('les trois moteurs calculent les mêmes capitaux propres', () => {
  for (const [nom, rows] of TOUTES) {
    const { ratios, scf, solva } = analyser(rows);
    assert.ok(Math.abs(ratios.capitauxPropres - scf.capitauxPropres.total) < 1,
      `ratios (${ratios.capitauxPropres}) ≠ bilan SCF (${scf.capitauxPropres.total}) sur « ${nom} »`);
    assert.ok(Math.abs(solva.bancaire.capitauxPropres - scf.capitauxPropres.total) < 1,
      `rating (${solva.bancaire.capitauxPropres}) ≠ bilan SCF (${scf.capitauxPropres.total}) sur « ${nom} »`);
  }
});

test('le compte 133 (impôts différés) reste hors des capitaux propres', () => {
  const avec133 = [...BALANCE_SAINE, L('133', 'Impôts différés passif', 0, 800_000)];
  const cpSans = computeCapitauxPropres(BALANCE_SAINE, { resultatNet: 0 }).total;
  const cpAvec = computeCapitauxPropres(avec133, { resultatNet: 0 }).total;
  assert.equal(cpAvec, cpSans, 'le compte 133 est un passif non courant, pas un capital propre');
});

// ── 3. Invariant : des fonds propres négatifs ne peuvent pas bien noter ─────

test('des capitaux propres négatifs plafonnent les critères Autonomie et Couverture', () => {
  const { ratios, solva } = analyser(BALANCE_FONDS_PROPRES_NEGATIFS);
  const ba = solva.bancaire.detailsBA;

  assert.ok(ratios.capitauxPropres < 0,
    `le jeu de test doit bien produire des fonds propres négatifs (obtenu ${ratios.capitauxPropres})`);
  assert.equal(ba.autonomie.score, 1,
    'sans dette LT mais avec des fonds propres négatifs, l\'autonomie ne vaut pas 5/5');
  assert.equal(ba.couverture.score, 1,
    'sans charge financière mais avec un EBE négatif, la couverture ne vaut pas 5/5');
  assert.notEqual(solva.bancaire.ratingBA, 'Excellent',
    'une entreprise en fonds propres négatifs ne peut pas être notée « Excellent »');
});

test('le rating bancaire reste cohérent avec le Z\'\'-Score', () => {
  const { solva } = analyser(BALANCE_FONDS_PROPRES_NEGATIFS);
  assert.ok(solva.zScore < 1.8, 'Z\'\' doit signaler la détresse');
  assert.ok(solva.bancaire.scoreBA <= 8,
    `le score BA (${solva.bancaire.scoreBA}/20) doit rester cohérent avec un Z'' en zone de détresse`);
});

// ── 4. Invariant : une estimation n'est jamais présentée comme une mesure ───

test('le repli forfaitaire ne s\'active que faute de comptes de capitaux propres', () => {
  const sans = analyser(BALANCE_SANS_CAPITAUX_PROPRES);
  assert.equal(sans.ratios.estimationPartielle, true, 'repli attendu et signalé');
  assert.ok(sans.ratios.capitauxPropres > 0);

  const nuls = analyser(BALANCE_CAPITAUX_PROPRES_NULS);
  assert.equal(nuls.ratios.capitauxPropres, 0, 'un zéro calculé est un résultat, pas une absence');
  assert.equal(nuls.ratios.estimationPartielle, false, 'aucun repli ne doit s\'activer sur un zéro réel');
});

test('le bilan officiel ne contient jamais de montant estimé', () => {
  const { scf, ratios } = analyser(BALANCE_SANS_CAPITAUX_PROPRES);
  assert.equal(ratios.estimationPartielle, true);
  assert.equal(scf.capitauxPropres.capitalEmis, 0,
    'un état financier officiel ne doit pas présenter de capital forfaitaire');
});

// ── 5. Parseur de montants ─────────────────────────────────────────────────

test('safeNum interprète les formats comptables courants', () => {
  assert.equal(safeNum('1 234 567,89'), 1234567.89, 'français, espace milliers');
  assert.equal(safeNum('1.234.567,89'), 1234567.89, 'français, point milliers');
  assert.equal(safeNum('1,234,567.89'), 1234567.89, 'anglo-saxon');
  assert.equal(safeNum('(1 234,56)'), -1234.56, 'négatif entre parenthèses');
  assert.equal(safeNum('1 234'), 1234, 'espace milliers sans décimales');
  assert.equal(safeNum(''), 0);
  assert.equal(safeNum(null), 0);
  assert.equal(safeNum('abc'), 0);
});

// ── 6. Séparateur décimal ambigu ───────────────────────────────────────────

test('detectDecimalSeparator lit l\'indice porté par le reste du fichier', () => {
  // Deux séparateurs dans une même valeur : le dernier est la décimale.
  assert.equal(detectDecimalSeparator(['1.234.567,89']), ',', 'format français');
  assert.equal(detectDecimalSeparator(['1,234,567.89']), '.', 'format anglo-saxon');
  // Séparateur répété : c'est celui des milliers, donc l'autre est la décimale.
  assert.equal(detectDecimalSeparator(['1.234.567']), ',', 'points répétés = milliers');
  // Nombre de chiffres ≠ 3 après le séparateur : un groupe de milliers en fait toujours 3.
  assert.equal(detectDecimalSeparator(['1234.56']), '.', 'deux décimales');
  assert.equal(detectDecimalSeparator(['12,5']), ',', 'une décimale');
  // Uniquement des cas ambigus : aucun indice exploitable.
  assert.equal(detectDecimalSeparator(['1.234', '5.678']), null, 'tout est ambigu');
  assert.equal(detectDecimalSeparator([]), null);
});

test('safeNum tranche « 1.234 » selon le séparateur décimal du fichier', () => {
  // Sans indication : lecture décimale historique, comportement inchangé.
  assert.equal(safeNum('1.234'), 1.234);
  assert.equal(safeNum('1,234'), 1.234);

  // Le fichier utilise la virgule comme décimale ⇒ le point est un séparateur de milliers.
  assert.equal(safeNum('1.234', ','), 1234);
  assert.equal(safeNum('1,234', ','), 1.234);

  // Le fichier utilise le point comme décimale ⇒ la virgule sépare les milliers.
  assert.equal(safeNum('1.234', '.'), 1.234);
  assert.equal(safeNum('1,234', '.'), 1234);

  // Aucune décimale observée dans tout le fichier ⇒ ce sont des milliers.
  assert.equal(safeNum('1.234', null), 1234);
  assert.equal(safeNum('1,234', null), 1234);

  // Les valeurs non ambiguës ne sont jamais affectées par l'indication.
  assert.equal(safeNum('1234.56', ','), 1234.56, 'deux décimales restent décimales');
  assert.equal(safeNum('12,5', '.'), 12.5, 'une décimale reste décimale');
  assert.equal(safeNum('1.234.567', ','), 1234567, 'séparateur répété inchangé');
});

test('un export à milliers pointés sans décimales n\'est plus divisé par 1000', () => {
  // Cas réel visé : "1.234.567" ailleurs dans le fichier révèle que le point sépare
  // les milliers, ce qui permet de lire "5.000" comme 5000 et non comme 5,000.
  const colonne = ['1.234.567', '5.000', '250', '12.500'];
  const sep = detectDecimalSeparator(colonne);
  assert.equal(sep, ',', 'le point est identifié comme séparateur de milliers');
  assert.deepEqual(
    colonne.map(v => safeNum(v, sep)),
    [1234567, 5000, 250, 12500]
  );
});
