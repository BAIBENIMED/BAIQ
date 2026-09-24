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
  verifyAccountNature,
  SEUIL_MATERIALITE_AUDIT,
  applyTvaRegimeToRatios,
  calculateTotauxProduitsCharges,
  buildRatiosBenchmarkRows,
  analyserBalance,
  construireDossier,
  rouvrirDossier,
  auditBalanceAccounts,
  calculateVariationCapitauxPropres,
  calculateTFT,
  calculateTotalActifNet,
} from '../src/utils/financeCalculations.js';
import { calculateAltmanZScore } from '../src/utils/solvabiliteEngine.js';
import { SECTEUR_DEFAUT } from '../src/utils/secteurs.js';

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

// ── 7. Seuil de matérialité de l'audit de balance ──────────────────────────

test('un solde anormal mais immatériel (< 100 DA) n\'est plus signalé', () => {
  assert.equal(SEUIL_MATERIALITE_AUDIT, 100);

  // Caisse légèrement créditrice (50 DA) : résidu immatériel, plus une anomalie critique.
  const caisseMinime = verifyAccountNature('53', 0, 50);
  assert.equal(caisseMinime.statut, 'CONFORME', caisseMinime.diagnostic);

  // Fournisseur légèrement débiteur (80 DA) : sous le seuil, ne doit pas être atypique.
  const fournisseurMinime = verifyAccountNature('401', 80, 0);
  assert.equal(fournisseurMinime.statut, 'CONFORME', fournisseurMinime.diagnostic);
});

test('un solde anormal significatif (≥ 100 DA) reste signalé', () => {
  // Caisse nettement créditrice (500 DA) : anomalie réelle, doit rester détectée.
  const caisseAnormale = verifyAccountNature('53', 0, 500);
  assert.equal(caisseAnormale.statut, 'ANOMALIE', caisseAnormale.diagnostic);

  // Fournisseur nettement débiteur (150 DA) : atypique réel, doit rester détecté.
  const fournisseurAnormal = verifyAccountNature('401', 150, 0);
  assert.equal(fournisseurAnormal.statut, 'ATYPIQUE', fournisseurAnormal.diagnostic);
});

test('un compte mixte (44) sous le seuil est traité comme apuré, pas comme créance/dette', () => {
  const solde30DA = verifyAccountNature('444', 30, 0);
  assert.equal(solde30DA.statut, 'CONFORME');
  assert.match(solde30DA.diagnostic, /apuré/i);

  const solde200DA = verifyAccountNature('444', 200, 0);
  assert.match(solde200DA.diagnostic, /créance fiscale/i);
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

// ── 8. Délais fournisseurs corrigés de la TVA ──────────────────────────────

/** Commerce avec achats (60) ET services extérieurs (61/62). */
const BALANCE_ACHATS_ET_SERVICES = [
  L('101', 'Capital social', 0, 500_000),
  L('401', 'Fournisseurs', 0, 500_000),
  L('512', 'Banque', 2_000_000, 0),
  L('601', 'Achats consommés', 1_000_000, 0),
  L('611', 'Sous-traitance', 600_000, 0),
  L('626', 'Télécommunications', 400_000, 0),
  L('701', 'Ventes', 0, 3_000_000),
];

/** Société de services : aucun compte 60. */
const BALANCE_SERVICES = [
  L('101', 'Capital social', 0, 200_000),
  L('401', 'Fournisseurs', 0, 100_000),
  L('512', 'Banque', 1_300_000, 0),
  L('611', 'Sous-traitance', 600_000, 0),
  L('626', 'Télécommunications', 400_000, 0),
  L('706', 'Prestations de services', 0, 2_000_000),
];

test('le DPO corrigé de la TVA garde la base Consommations (60+61+62)', () => {
  assert.equal(checkBalanceEquilibre(BALANCE_ACHATS_ET_SERVICES).equilibre, true);
  const { ratios } = analyser(BALANCE_ACHATS_ET_SERVICES);
  assert.equal(Math.round(ratios.delaiFournisseurs), 90, 'DPO HT : 500 000 / 2 000 000 × 360');

  // 90 j / 1,19 ≈ 75,6 j TTC — et non 151 j, qui divisait par le seul compte 60.
  const ttc = applyTvaRegimeToRatios(ratios, { tauxTva: 19 });
  assert.ok(Math.abs(ttc.delaiFournisseurs - 90 / 1.19) < 1e-9, `DPO TTC obtenu : ${ttc.delaiFournisseurs}`);

  const franchise = applyTvaRegimeToRatios(ratios, { achatsFranchises: true, tauxTva: 19 });
  assert.equal(franchise.delaiFournisseurs, ratios.delaiFournisseurs, 'achats franchisés : DPO HT inchangé');
});

test('une société de services sans compte 60 a un DPO réel, pas 0 j', () => {
  assert.equal(checkBalanceEquilibre(BALANCE_SERVICES).equilibre, true);
  const { ratios } = analyser(BALANCE_SERVICES);
  const ttc = applyTvaRegimeToRatios(ratios, { tauxTva: 19 });
  // 100 000 / (1 000 000 × 1,19) × 360 ≈ 30,3 j
  assert.ok(Math.abs(ttc.delaiFournisseurs - 36 / 1.19) < 1e-9, `DPO TTC obtenu : ${ttc.delaiFournisseurs}`);
});

test('réappliquer la correction TVA ne la cumule pas', () => {
  const { ratios } = analyser(BALANCE_SAINE);
  const une = applyTvaRegimeToRatios(ratios, { tauxTva: 19 });
  const deux = applyTvaRegimeToRatios(une, { tauxTva: 19 });
  assert.equal(deux.delaiFournisseurs, une.delaiFournisseurs);
  assert.equal(deux.delaiRecouvrement, une.delaiRecouvrement);

  // Passer ensuite en franchise totale ramène exactement aux délais HT d'origine.
  const retour = applyTvaRegimeToRatios(une, { ventesFranchisees: true, achatsFranchises: true });
  assert.equal(retour.delaiFournisseurs, ratios.delaiFournisseurs);
  assert.equal(retour.delaiRecouvrement, ratios.delaiRecouvrement);
});

// ── 9. Totaux produits / charges du tableau de bord ────────────────────────

test('les totaux produits/charges retombent toujours sur le résultat net du SIG', () => {
  for (const [nom, rows] of TOUTES) {
    const { sig } = analyser(rows);
    const totaux = calculateTotauxProduitsCharges(rows);
    assert.ok(Math.abs(totaux.resultat - sig.resultatNet) < 0.01,
      `« ${nom} » : ${totaux.resultat} au lieu de ${sig.resultatNet}`);
  }
});

test('un compte de produits ou de charges en sens inverse vient en déduction', () => {
  // 709 (RRR accordés) débiteur et 603 (variation de stocks) créditeur réduisent leur
  // classe : les additionner en valeur absolue donnait 350 000 de résultat au lieu de 450 000.
  const rows = [
    L('512', 'Banque', 450_000, 0),
    L('600', 'Achats de marchandises', 600_000, 0),
    L('603', 'Variation des stocks', 0, 100_000),
    L('700', 'Ventes de marchandises', 0, 1_000_000),
    L('709', 'RRR accordés', 50_000, 0),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  assert.deepEqual(calculateTotauxProduitsCharges(rows), { produits: 950_000, charges: 500_000, resultat: 450_000 });
  assert.equal(analyser(rows).sig.resultatNet, 450_000);
});

test('sans lignes de balance, aucun montant n\'est inventé', () => {
  assert.deepEqual(calculateTotauxProduitsCharges([]), { produits: 0, charges: 0, resultat: 0 });
  assert.deepEqual(calculateTotauxProduitsCharges(undefined), { produits: 0, charges: 0, resultat: 0 });
});

// ── 10. Feuille Ratios de l'export Excel ───────────────────────────────────

const BM = SECTEUR_DEFAUT.benchmarks;
const ligneRatio = (lignes, debut) => lignes.find(l => l[0].startsWith(debut));

test('la feuille Ratios n\'affiche aucune valeur de repli quand un dénominateur est nul', () => {
  const lignes = buildRatiosBenchmarkRows(
    { chiffreAffaires: 0, ebe: -500_000, valeurAjoutee: 0, chargesPersonnel: 0 },
    { delaiFournisseurs: 0, delaiRecouvrement: 0 },
    BM
  );
  assert.equal(lignes.length, 10);
  for (const debut of ['Marge EBE', 'Taux de Valeur', 'Délai Recouvrement', 'Délai Paiement', 'Rotation', 'BFR', 'Productivité']) {
    const l = ligneRatio(lignes, debut);
    assert.equal(l[1], '—', `${debut} : valeur ${l[1]}`);
    assert.equal(l[3], 'NON CALCULABLE', `${debut} : statut ${l[3]}`);
  }
});

test('la productivité et le statut du DPO dépendent des vraies valeurs', () => {
  const sig = { chiffreAffaires: 5_000_000, consommationExercice: 2_000_000, valeurAjoutee: 3_200_000, chargesPersonnel: 2_000_000 };
  const lignes = buildRatiosBenchmarkRows(sig, { achats: 1_000_000, delaiFournisseurs: 40 }, BM);
  assert.equal(ligneRatio(lignes, 'Productivité')[1], '1.60x');

  const statutDpo = (dpo) => ligneRatio(buildRatiosBenchmarkRows(sig, { achats: 1_000_000, delaiFournisseurs: dpo }, BM), 'Délai Paiement')[3];
  assert.equal(statutDpo(BM.dpo.min - 1), 'TROP RAPIDE');
  assert.equal(statutDpo((BM.dpo.min + BM.dpo.max) / 2), 'ÉQUILIBRÉ');
  assert.equal(statutDpo(BM.dpo.max + 1), 'LENT');
});

// ── 11. Dossiers enregistrés ───────────────────────────────────────────────

test('analyserBalance produit exactement la chaîne de calcul complète', () => {
  const attendu = analyser(BALANCE_SAINE);
  const obtenu = analyserBalance(BALANCE_SAINE);
  assert.deepEqual(obtenu.bilan, attendu.bilan);
  assert.deepEqual(obtenu.sig, attendu.sig);
  assert.deepEqual(obtenu.ratios, attendu.ratios);
  assert.deepEqual(obtenu.bilanSCF, attendu.scf);
  assert.equal(obtenu.rows, BALANCE_SAINE);
});

test('un dossier enregistré avec des résultats figés est recalculé à l\'ouverture', () => {
  const profil = { nomEntreprise: 'SARL Test', secteurId: 'industrie' };
  const frais = construireDossier(BALANCE_SAINE, BALANCE_AVEC_COMPTE_12, profil);
  // Ancien format : résultats enregistrés avec les balances, ici volontairement faux,
  // comme ceux produits par une version antérieure du moteur.
  const ancien = {
    profil,
    data: {
      ...frais,
      sig: { ...frais.sig, resultatNet: 123 },
      ratios: { ...frais.ratios, delaiFournisseurs: 999 },
      dataN1: { ...frais.dataN1, sig: { ...frais.dataN1.sig, resultatNet: 456 } },
    },
  };
  const rouvert = rouvrirDossier(ancien);
  assert.deepEqual(rouvert.sig, frais.sig);
  assert.deepEqual(rouvert.ratios, frais.ratios);
  assert.deepEqual(rouvert.dataN1.sig, frais.dataN1.sig);
  assert.deepEqual(rouvert.profil, profil);
});

test('un dossier enregistré avec ses seules balances se rouvre à l\'identique', () => {
  const profil = { nomEntreprise: 'SARL Test' };
  const frais = construireDossier(BALANCE_SAINE, null, profil);
  const enregistre = { profil, data: { rows: BALANCE_SAINE, profil, dataN1: null } };
  const rouvert = rouvrirDossier(enregistre);
  assert.deepEqual(rouvert, frais);
  assert.equal(rouvert.dataN1, null);
});

// ── 12. Audit de balance (source unique de l'écran Audit, du PDF, de l'Excel,
//        du tableau de bord et du moteur IA) ─────────────────────────────────

const statutAudit = (rows, compte) =>
  auditBalanceAccounts(rows).comptesAudit.find(c => c.compte === compte).verification.statut;

test('l\'audit de balance applique le sens normal de chaque compte', () => {
  const rows = [
    L('519', 'Concours bancaires courants', 0, 3_000_000), // créditeur par nature
    L('131', 'Subvention d\'équipement', 200_000, 0),       // débiteur : anomalie
    L('531', 'Caisse', 0, 5_000),                            // caisse créditrice
    L('471', 'Compte d\'attente', 12_000, 0),                // non soldé
    L('401', 'Fournisseurs', 0, 800_000),                    // sens normal
    L('512', 'Banque', 3_988_000, 0),
    L('101', 'Capital', 0, 395_000),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  assert.equal(statutAudit(rows, '519'), 'CONFORME');
  assert.equal(statutAudit(rows, '131'), 'ANOMALIE');
  assert.equal(statutAudit(rows, '531'), 'ANOMALIE');
  assert.equal(statutAudit(rows, '471'), 'ATYPIQUE');
  assert.equal(statutAudit(rows, '401'), 'CONFORME');
});

test('l\'audit de balance ignore les lignes exclues et les soldes immatériels', () => {
  const rows = [
    L('531', 'Caisse', 0, 60),                                              // < 100 DA
    { ...L('531', 'Caisse (ligne exclue)', 0, 50_000), ignore: true },
  ];
  const audit = auditBalanceAccounts(rows);
  assert.equal(audit.total, 1, 'la ligne exclue n\'est pas auditée');
  assert.equal(audit.anomalies, 0);
  assert.equal(audit.scoreCoherence, 100);
});

// ── 13. Tableau de variation des capitaux propres (TVCP) ───────────────────

/** Ligne de balance avec soldes d'ouverture ET de clôture. */
const LD = (compte, libelle, [debutD, debutC], [finD, finC]) => ({
  ...L(compte, libelle, finD, finC),
  soldeDebutDebit: debutD, soldeDebutCredit: debutC,
});

const tvcpDe = (rows) => {
  const { sig } = analyser(rows);
  return calculateVariationCapitauxPropres(rows, null, sig);
};
const COLONNES_TVCP = ['capital', 'reserves', 'ecarts', 'ran', 'resultat'];

test('la clôture du TVCP est toujours égale aux capitaux propres du bilan SCF', () => {
  for (const [nom, rows] of TOUTES) {
    const { scf } = analyser(rows);
    const tvcp = tvcpDe(rows);
    assert.ok(Math.abs(tvcp.kpis.totalFin - scf.capitauxPropres.total) < 0.01,
      `« ${nom} » : TVCP ${tvcp.kpis.totalFin} ≠ bilan ${scf.capitauxPropres.total}`);
  }
});

test('chaque colonne du TVCP va de son ouverture à sa clôture par les mouvements', () => {
  const rows = [
    LD('101', 'Capital', [0, 10_000_000], [0, 12_000_000]),
    LD('106', 'Réserves', [0, 0], [0, 600_000]),
    LD('105', 'Écart de réévaluation', [0, 0], [0, 300_000]),
    LD('110', 'Report à nouveau', [0, 0], [0, 100_000]),
    LD('120', 'Résultat en instance', [0, 1_000_000], [0, 0]),
    LD('512', 'Banque', [11_000_000, 0], [14_000_000, 0]),
    LD('701', 'Ventes', [0, 0], [0, 1_000_000]),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  const { lignes } = tvcpDe(rows);
  const ouverture = lignes.find(l => l.id === 'ouverture');
  const cloture = lignes.find(l => l.id === 'cloture');
  const mouvements = lignes.filter(l => !['ouverture', 'cloture'].includes(l.id));
  for (const col of [...COLONNES_TVCP, 'total']) {
    const somme = ouverture[col] + mouvements.reduce((s, l) => s + l[col], 0);
    assert.ok(Math.abs(somme - cloture[col]) < 0.01, `colonne ${col} : ${somme} ≠ ${cloture[col]}`);
  }
  for (const l of lignes) {
    const somme = COLONNES_TVCP.reduce((s, c) => s + l[c], 0);
    assert.ok(Math.abs(somme - l.total) < 0.01, `ligne ${l.id} : total ${l.total} ≠ ${somme}`);
  }
});

test('les subventions (classe 13) ne sont pas comptées dans les capitaux propres du TVCP', () => {
  const rows = [
    L('101', 'Capital', 0, 10_000_000),
    L('131', 'Subvention d\'équipement', 0, 2_000_000),
    L('512', 'Banque', 12_000_000, 0),
  ];
  const { scf } = analyser(rows);
  assert.equal(tvcpDe(rows).kpis.totalFin, 10_000_000);
  assert.equal(scf.capitauxPropres.total, 10_000_000);
});

test('un résultat antérieur resté au compte 12 n\'est pas compté comme des dividendes', () => {
  // 1 M de résultat N-1 non affecté, à l'ouverture comme à la clôture, et 300 k de résultat N.
  const rows = [
    LD('101', 'Capital', [0, 10_000_000], [0, 10_000_000]),
    LD('120', 'Résultat en instance', [0, 1_000_000], [0, 1_000_000]),
    LD('512', 'Banque', [11_000_000, 0], [11_300_000, 0]),
    LD('701', 'Ventes', [0, 0], [0, 300_000]),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  const { kpis, lignes } = tvcpDe(rows);
  assert.equal(kpis.dividendesEstimes, 0);
  assert.equal(kpis.totalFin, 11_300_000);
  assert.equal(lignes.find(l => l.id === 'cloture').resultat, 1_300_000);
});

test('un résultat affecté en partie aux réserves fait apparaître le solde distribué', () => {
  // 1 M de résultat N-1 : 600 k mis en réserve, 400 k versés (sortie de banque).
  const rows = [
    LD('101', 'Capital', [0, 10_000_000], [0, 10_000_000]),
    LD('106', 'Réserves', [0, 0], [0, 600_000]),
    LD('120', 'Résultat en instance', [0, 1_000_000], [0, 0]),
    LD('512', 'Banque', [11_000_000, 0], [10_600_000, 0]),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  const { kpis } = tvcpDe(rows);
  assert.equal(kpis.affectationReserves, 600_000);
  assert.equal(kpis.dividendesEstimes, 400_000);
  assert.equal(kpis.totalFin, 10_600_000);
});

// ── 14. Tableau des flux de trésorerie (TFT) ───────────────────────────────

const tftDe = (rowsN, rowsN1) => calculateTFT({ ...analyserBalance(rowsN), dataN1: analyserBalance(rowsN1) });
const BALANCE_N1_BENEFICE = [
  L('101', 'Capital', 0, 10_000_000),
  L('512', 'Banque', 11_000_000, 0),
  L('701', 'Ventes', 0, 1_000_000),
];

test('TFT : un résultat N-1 resté au compte 12 n\'est pas un dividende versé', () => {
  const rowsN = [
    L('101', 'Capital', 0, 10_000_000),
    L('120', 'Résultat en instance', 0, 1_000_000),
    L('512', 'Banque', 11_300_000, 0),
    L('701', 'Ventes', 0, 300_000),
  ];
  assert.equal(tftDe(rowsN, BALANCE_N1_BENEFICE).financement.dividendesVerses, 0);
});

test('TFT : la part du résultat N-1 ni mise en réserve ni en instance est distribuée', () => {
  const rowsN = [
    L('101', 'Capital', 0, 10_000_000),
    L('106', 'Réserves', 0, 600_000),
    L('512', 'Banque', 10_600_000, 0),
  ];
  assert.equal(tftDe(rowsN, BALANCE_N1_BENEFICE).financement.dividendesVerses, 400_000);
});

test('TFT : un capital souscrit mais non appelé n\'apporte pas de trésorerie', () => {
  const rowsN1 = [L('101', 'Capital', 0, 10_000_000), L('512', 'Banque', 10_000_000, 0)];
  const rowsN = [
    L('101', 'Capital', 0, 12_000_000),
    L('109', 'Capital souscrit non appelé', 2_000_000, 0),
    L('512', 'Banque', 10_000_000, 0),
  ];
  assert.equal(tftDe(rowsN, rowsN1).financement.augmentationCapital, 0);
});

// ── 15. Base « total bilan » des ratios et endettement net ──────────────────

test('le total bilan des ratios est le total actif net du bilan SCF', () => {
  const avecImpotsDifferes = [
    L('213', 'Constructions', 5_000_000, 0),
    L('281', 'Amortissements', 0, 1_000_000),
    L('133', 'Impôts différés actif', 300_000, 0),
    L('512', 'Banque', 700_000, 0),
    L('101', 'Capital', 0, 5_000_000),
  ];
  for (const [nom, rows] of [...TOUTES, ['impôts différés actif', avecImpotsDifferes]]) {
    const { bilan, scf, ratios } = analyser(rows);
    const net = calculateTotalActifNet(bilan, rows);
    assert.ok(Math.abs(net - scf.totalActif) < 0.01, `« ${nom} » : ${net} ≠ ${scf.totalActif}`);
    assert.ok(Math.abs(ratios.totalActifNet - scf.totalActif) < 0.01, `« ${nom} » (ratios)`);
  }
});

test('autonomie, ROA, solvabilité et Altman divisent par le total actif net', () => {
  // Immobilisations brutes 10 M amorties de 6 M : total actif net 7 M (et non 13 M brut).
  const rows = [
    L('213', 'Constructions', 10_000_000, 0),
    L('281', 'Amortissements', 0, 6_000_000),
    L('411', 'Clients', 2_000_000, 0),
    L('512', 'Banque', 1_000_000, 0),
    L('101', 'Capital', 0, 4_000_000),
    L('401', 'Fournisseurs', 0, 2_000_000),
    L('701', 'Ventes', 0, 1_000_000),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  const { bilan, ratios, solva, scf } = analyser(rows);
  assert.equal(scf.totalActif, 7_000_000);
  assert.ok(Math.abs(ratios.autonomieFinanciere - 5 / 7) < 1e-9, `autonomie ${ratios.autonomieFinanciere}`); // 71,4 % et non 38,5 %
  assert.ok(Math.abs(ratios.roa - 1 / 7) < 1e-9, `ROA ${ratios.roa}`);
  assert.ok(Math.abs(ratios.solvabilite - 7 / 2) < 1e-9, `solvabilité ${ratios.solvabilite}`);
  assert.ok(Math.abs(solva.ratios.x1.val - bilan.frng / 7_000_000) < 1e-9, 'Altman X1');
  assert.ok(Math.abs(solva.ratios.x3.val - 1 / 7) < 1e-9, 'Altman X3');
});

test('sans dette financière, les dettes fournisseurs ne dégradent pas le statut crédit', () => {
  // Aucun emprunt ni concours bancaire ; 6 M de fournisseurs pour 1 M d'EBE.
  const rows = [
    L('411', 'Clients', 6_900_000, 0),
    L('512', 'Banque', 100_000, 0),
    L('401', 'Fournisseurs', 0, 6_000_000),
    L('701', 'Ventes', 0, 1_000_000),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  const { bancaire } = analyser(rows).solva;
  assert.equal(bancaire.dettesNettes, 0);
  assert.equal(bancaire.ratioDetteSurEBE, 0);
  assert.notEqual(bancaire.statutCredit, 'DÉFAVORABLE');
});

test('l\'endettement net compte les emprunts et les concours bancaires, moins la trésorerie', () => {
  const rows = [
    L('213', 'Constructions', 4_500_000, 0),
    L('411', 'Clients', 1_000_000, 0),
    L('512', 'Banque', 500_000, 0),
    L('101', 'Capital', 0, 1_000_000),
    L('164', 'Emprunts bancaires', 0, 3_000_000),
    L('519', 'Concours bancaires courants', 0, 1_000_000),
    L('701', 'Ventes', 0, 1_000_000),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);
  const { bancaire } = analyser(rows).solva;
  assert.equal(bancaire.dettesNettes, 3_500_000);
  assert.ok(Math.abs(bancaire.ratioDetteSurEBE - 3.5) < 1e-9);
});

// ── 16. Simulateur What-If ──────────────────────────────────────────────────

test('une écriture simulée ne se perd pas dans une ligne de total ignorée', async () => {
  const { recalculateSimulatedDataset } = await import('../src/utils/simulationEngine.js');
  const totalIgnore = { ...L('28', 'Total amortissements', 0, 1_000_000), isTotal: true, ignore: true };
  const rows = [
    L('213', 'Constructions', 5_000_000, 0),
    L('2813', 'Amortissements des constructions', 0, 1_000_000),
    totalIgnore,
    L('512', 'Banque', 1_000_000, 0),
    L('101', 'Capital', 0, 5_000_000),
  ];
  assert.equal(checkBalanceEquilibre(rows).equilibre, true);

  const sim = recalculateSimulatedDataset(analyserBalance(rows), [
    { label: 'Dotation aux amortissements', montant: 500_000, debitCompte: '681', creditCompte: '28' },
  ]);
  assert.ok(Math.abs(sim.bilanSCF.totalActif - sim.bilanSCF.totalPassif) < 0.01,
    `bilan simulé déséquilibré : actif ${sim.bilanSCF.totalActif}, passif ${sim.bilanSCF.totalPassif}`);
  assert.equal(checkBalanceEquilibre(sim.rows).equilibre, true);
  assert.equal(sim.rows.find(r => r.compte === '2813').soldeFinCredit, 1_500_000, 'le crédit va au sous-compte réel');
  assert.equal(sim.rows.find(r => r.compte === '28').soldeFinCredit, 1_000_000, 'la ligne de total ignorée est intacte');
  assert.equal(sim.sig.resultatNet, -500_000);
});

test('le simulateur conserve l\'équilibre du bilan sur les balances de référence', async () => {
  const { recalculateSimulatedDataset } = await import('../src/utils/simulationEngine.js');
  const ecritures = [
    { label: 'Vente simulée', montant: 1_000_000, debitCompte: '411', creditCompte: '701' },
    { label: 'Achat simulé', montant: 400_000, debitCompte: '601', creditCompte: '401' },
  ];
  for (const [nom, rows] of TOUTES) {
    const sim = recalculateSimulatedDataset(analyserBalance(rows), ecritures);
    assert.ok(Math.abs(sim.bilanSCF.totalActif - sim.bilanSCF.totalPassif) < 0.01, `« ${nom} » : bilan simulé déséquilibré`);
    assert.ok(Math.abs(sim.sig.resultatNet - analyserBalance(rows).sig.resultatNet - 600_000) < 0.01, `« ${nom} » : résultat simulé`);
  }
});

// ── 17. Confidentialité des requêtes Gemini ────────────────────────────────

test('le nom de l\'entreprise n\'est jamais envoyé à Gemini et revient dans la réponse', async () => {
  const { generateGeminiReport, buildGeminiContext, runAIAnalysis, REPERE_ENTREPRISE } = await import('../src/utils/aiEngine.js');
  const NOM = 'SARL Très Confidentielle';
  const dossier = construireDossier(BALANCE_SAINE, null, { nomEntreprise: NOM, secteurId: 'industrie', effectif: '12' });

  assert.doesNotMatch(buildGeminiContext(dossier, runAIAnalysis(dossier)), /Très Confidentielle/);

  const fetchReel = globalThis.fetch;
  const envoyes = [];
  globalThis.fetch = async (_url, options) => {
    envoyes.push(options.body);
    const texte = `Rapport de ${REPERE_ENTREPRISE} : situation financière saine et structure équilibrée, détaillée ci-dessous.`;
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: texte }] } }] }) };
  };
  try {
    for (const type of ['analyse_approfondie', 'audit_diagnostic', 'recommendations_plan', 'banque_credit']) {
      const rapport = await generateGeminiReport(dossier, type);
      assert.match(rapport, /Rapport de SARL Très Confidentielle/, `${type} : nom restauré dans la réponse`);
      assert.doesNotMatch(rapport, new RegExp(REPERE_ENTREPRISE, 'i'), `${type} : nom d'emprunt remplacé`);
    }
  } finally {
    globalThis.fetch = fetchReel;
  }
  assert.equal(envoyes.length, 4);
  for (const corps of envoyes) assert.doesNotMatch(corps, /Très Confidentielle/, 'nom présent dans une requête envoyée');
});

test('l\'analyse approfondie transmet tous les indicateurs et demande une réponse longue', async () => {
  const { generateGeminiReport, buildGeminiContext, runAIAnalysis } = await import('../src/utils/aiEngine.js');
  const dossier = construireDossier(BALANCE_SAINE, BALANCE_AVEC_COMPTE_12, { nomEntreprise: 'SARL Test', secteurId: 'industrie' });
  const contexte = buildGeminiContext(dossier, runAIAnalysis(dossier));
  for (const section of ['BILAN OFFICIEL SCF — ACTIF', 'BILAN OFFICIEL SCF — PASSIF', 'TCR OFFICIEL', 'BILAN FONCTIONNEL',
    'RATIOS', 'Altman', 'Banque d\'Algérie', 'TVCP', 'TFT', 'ÉVOLUTION DES STOCKS', 'QUALITÉ DES COMPTES',
    'ÉVOLUTION N / N-1', 'PRÉ-DIAGNOSTIC']) {
    assert.ok(contexte.includes(section), `section absente du contexte : ${section}`);
  }
  assert.match(contexte, /\| N-1 \|/, 'colonnes N-1 présentes quand l\'exercice précédent est fourni');

  const fetchReel = globalThis.fetch;
  let corps = null;
  globalThis.fetch = async (_url, options) => {
    corps = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Analyse approfondie de ZETACORP : structure saine, rentabilité élevée, points de vigilance détaillés.' }] } }] }) };
  };
  try {
    await generateGeminiReport(dossier, 'analyse_approfondie');
  } finally {
    globalThis.fetch = fetchReel;
  }
  assert.equal(corps.body.generationConfig.maxOutputTokens, 16384);
  assert.match(corps.body.contents[0].parts[0].text, /ANALYSE FINANCIÈRE APPROFONDIE ET INTÉGRALE/);
});
