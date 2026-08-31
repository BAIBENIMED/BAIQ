/* ═══════════════════════════════════════════════════════════
   BAIQ — Générateur d'Export Excel Multi-Feuilles (.xlsx)
   Classeur financier complet structuré selon les normes SCF Algérie
   Feuilles (9) :
   1. Synthèse, Rating & Capacité d'Emprunt
   2. Bilan Fonctionnel SCF (Actif & Passif)
   3. Bilan Officiel SCF (Actif / Passif détaillé par rubrique, arrêté du 26/07/2008)
   4. Compte de Résultat (TCR & SIG par Nature, numérotation officielle I à X)
   5. Tableau de Variation des Capitaux Propres (TVCP)
   6. Tableau des Flux de Trésorerie (TFT, méthode indirecte)
   7. Ratios & Benchmarks Sectoriels
   8. Audit de Conformité SCF & Flux Croisés
   9. Balance Générale des Comptes (Grand Livre)
   ═══════════════════════════════════════════════════════════ */

import * as XLSX from 'xlsx';
import { getSecteur } from './secteurs';
import { calculateAltmanZScore } from './solvabiliteEngine';
import { auditBalanceAccounts, auditCrossAccountMovements, calculateVariationCapitauxPropres, buildTCRRows, calculateTFT } from './financeCalculations';

export function exportFinancialWorkbook(data, filename = 'BAIQ_Analyse_Financiere_SCF.xlsx', cur) {
  if (!data) return false;

  const { bilan = {}, sig = {}, ratios = {}, rows = [], profil = {}, dataN1 = null, bilanSCF = {} } = data;
  // Devise déclarée par l'utilisateur (fenêtre de finalisation post-import / Paramètres) —
  // remplace le "DZD" générique par défaut dans les en-têtes de ce classeur.
  const currency = cur || profil?.currency || 'DZD';
  const secteur = getSecteur(profil.secteurId);
  const bm = secteur.benchmarks;
  const solv = calculateAltmanZScore(bilan, sig, rows);
  const auditNatures = auditBalanceAccounts(rows);
  const auditFlux = auditCrossAccountMovements(rows);
  const tvcp = calculateVariationCapitauxPropres(rows, dataN1, sig);
  const tft = calculateTFT(data);

  const wb = XLSX.utils.book_new();

  /* ──────────────────────────────────────────────────────────
     FEUILLE 1 : SYNTHÈSE, RATING CRÉDIT & CAPACITÉ D'EMPRUNT
     ────────────────────────────────────────────────────────── */
  const ws1Data = [
    ['BAIQ — BALANCE AND FINANCIAL ANALYTICS — CLASSEUR FINANCIER OFFICIEL SCF'],
    ['Date d\'exportation', new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR')],
    [],
    ['1. PROFIL DE L\'ENTREPRISE'],
    ['Raison Sociale / Dossier', profil.nomEntreprise || 'Dossier Anonyme'],
    ['Secteur d\'Activité SCF', secteur.label],
    ['Taux IBS Applicable', secteur.tauxIBS],
    ['Taux TVA Standard', secteur.tvaStandard],
    ['Effectif Salarié (ETP)', profil.effectif ? `${profil.effectif} ETP` : 'Non renseigné'],
    [],
    ['2. NOTATION DU RISQUE CRÉDIT & CAPACITÉ D\'ENDETTEMENT (BANQUE D\'ALGÉRIE / ALTMAN Z\'\')'],
    ['Score Altman Z\'\' (Marchés émergents)', Number(solv.zScore.toFixed(2))],
    ['Rating de Solvabilité Global', solv.rating],
    ['Zone de Risque', solv.zoneLabel],
    ['Niveau de Risque (indicatif, zone Altman Z\'\', non calibré statistiquement)', solv.risqueDefaillance],
    ['Score de Solvabilité Globale', `${solv.scoreSolvabilite} / 100`],
    ['Score Banque d\'Algérie', `${solv.bancaire.scoreBA} / 20 points`],
    ['Avis d\'Accord Crédit Bancaire', solv.bancaire.statutCredit],
    [`Capacité d'Endettement Théorique Max (${currency})`, Math.round(solv.bancaire.capaciteEndettementMax || 0)],
    ['Règle Bancaire Appliquée', 'Dettes Financières LT ≤ 3.5 × EBE'],
    ['Couverture des Charges Financières (EBE / Intérêts)', solv.bancaire.couvertureChargesFin >= 90 ? 'Aucune charge financière' : `${solv.bancaire.couvertureChargesFin.toFixed(2)}x`],
    ['Dette Nette / EBE (Années de remboursement)', `${solv.bancaire.ratioDetteSurEBE.toFixed(2)} an(s)`],
    ...(solv.estimationPartielle ? [['⚠️ Avertissement', solv.estimationPartielleMessage]] : []),
    [],
    [`3. GRANDS AGRÉGATS FINANCIERS DE GESTION (${currency})`],
    ['Indicateur Financier', `Exercice N (${currency})`, `Exercice N-1 (${currency})`, `Variation (${currency})`, 'Variation (%)'],
    ['Chiffre d\'Affaires (CA)', sig.chiffreAffaires || 0, dataN1?.sig?.chiffreAffaires || '', (sig.chiffreAffaires || 0) - (dataN1?.sig?.chiffreAffaires || 0), dataN1?.sig?.chiffreAffaires ? `${(((sig.chiffreAffaires || 0) - dataN1.sig.chiffreAffaires) / dataN1.sig.chiffreAffaires * 100).toFixed(1)}%` : ''],
    ['Valeur Ajoutée (VA)', sig.valeurAjoutee || 0, dataN1?.sig?.valeurAjoutee || '', (sig.valeurAjoutee || 0) - (dataN1?.sig?.valeurAjoutee || 0), ''],
    ['Excédent Brut d\'Exploitation (EBE)', sig.ebe || 0, dataN1?.sig?.ebe || '', (sig.ebe || 0) - (dataN1?.sig?.ebe || 0), ''],
    ['Résultat Opérationnel (EBIT)', sig.resultatExploitation || 0, dataN1?.sig?.resultatExploitation || '', (sig.resultatExploitation || 0) - (dataN1?.sig?.resultatExploitation || 0), ''],
    ['Résultat Net de l\'Exercice', sig.resultatNet || 0, dataN1?.sig?.resultatNet || '', (sig.resultatNet || 0) - (dataN1?.sig?.resultatNet || 0), ''],
    ['Fonds de Roulement Net Global (FRNG)', bilan.frng || 0, dataN1?.bilan?.frng || '', (bilan.frng || 0) - (dataN1?.bilan?.frng || 0), ''],
    ['Besoin en Fonds de Roulement (BFR)', bilan.bfr || 0, dataN1?.bilan?.bfr || '', (bilan.bfr || 0) - (dataN1?.bilan?.bfr || 0), ''],
    ['Trésorerie Nette (TN)', bilan.tn || 0, dataN1?.bilan?.tn || '', (bilan.tn || 0) - (dataN1?.bilan?.tn || 0), ''],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  ws1['!cols'] = [{ wch: 48 }, { wch: 25 }, { wch: 22 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Synthèse & Solvabilité');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 2 : BILAN FONCTIONNEL
     ────────────────────────────────────────────────────────── */
  const totActifN = (bilan.emploisStables || 0) + (bilan.actifCirculant || 0) + (bilan.tresorerieActive || 0);
  const totActifN1 = (dataN1?.bilan?.emploisStables || 0) + (dataN1?.bilan?.actifCirculant || 0) + (dataN1?.bilan?.tresorerieActive || 0);
  const totPassifN = (bilan.ressourcesStables || 0) + (bilan.passifCirculant || 0) + (bilan.tresoreriePassive || 0);
  const totPassifN1 = (dataN1?.bilan?.ressourcesStables || 0) + (dataN1?.bilan?.passifCirculant || 0) + (dataN1?.bilan?.tresoreriePassive || 0);

  const ws2Data = [
    ['BILAN FONCTIONNEL CONDENSÉ (SCF)'],
    [`Devise : ${currency}`],
    [],
    ['I. ACTIF DU BILAN (EMPLOIS)', `Exercice N (${currency})`, `Exercice N-1 (${currency})`, 'Part Actif N (%)'],
    ['Emplois Stables (Actifs non courants bruts)', bilan.emploisStables || 0, dataN1?.bilan?.emploisStables || '', `${(((bilan.emploisStables || 0) / (totActifN || 1)) * 100).toFixed(1)}%`],
    ['Actif Circulant d\'Exploitation (Stocks + Créances clients)', bilan.actifCirculant || 0, dataN1?.bilan?.actifCirculant || '', `${(((bilan.actifCirculant || 0) / (totActifN || 1)) * 100).toFixed(1)}%`],
    ['Trésorerie Active (Disponibilités & Banques débitrices)', bilan.tresorerieActive || 0, dataN1?.bilan?.tresorerieActive || '', `${(((bilan.tresorerieActive || 0) / (totActifN || 1)) * 100).toFixed(1)}%`],
    ['TOTAL GÉNÉRAL DE L\'ACTIF', totActifN, totActifN1 || '', '100.0%'],
    [],
    ['II. PASSIF DU BILAN (RESSOURCES)', `Exercice N (${currency})`, `Exercice N-1 (${currency})`, 'Part Passif N (%)'],
    ['Ressources Stables (Capitaux Propres + Dettes LT + Amort.)', bilan.ressourcesStables || 0, dataN1?.bilan?.ressourcesStables || '', `${(((bilan.ressourcesStables || 0) / (totPassifN || 1)) * 100).toFixed(1)}%`],
    ['Passif Circulant d\'Exploitation (Fournisseurs + Dettes fiscales/sociales)', bilan.passifCirculant || 0, dataN1?.bilan?.passifCirculant || '', `${(((bilan.passifCirculant || 0) / (totPassifN || 1)) * 100).toFixed(1)}%`],
    ['Trésorerie Passive (Concours bancaires courants & soldes créditeurs)', bilan.tresoreriePassive || 0, dataN1?.bilan?.tresoreriePassive || '', `${(((bilan.tresoreriePassive || 0) / (totPassifN || 1)) * 100).toFixed(1)}%`],
    ['TOTAL GÉNÉRAL DU PASSIF', totPassifN, totPassifN1 || '', '100.0%'],
    [],
    ['III. ÉQUILIBRE FINANCIER STRUCTUREL', `Montant N (${currency})`, 'Formule de calcul', 'Interprétation'],
    ['Fonds de Roulement Net Global (FRNG)', bilan.frng || 0, 'Ressources Stables − Emplois Stables', (bilan.frng || 0) >= 0 ? 'Excédent de financement stable (Sécurisé)' : 'Déficit structurel (Risque)'],
    ['Besoin en Fonds de Roulement (BFR)', bilan.bfr || 0, 'Actif Circulant − Passif Circulant', (bilan.bfr || 0) >= 0 ? 'Besoin de trésorerie d\'exploitation' : 'Ressource d\'exploitation'],
    ['Trésorerie Nette (TN)', bilan.tn || 0, 'FRNG − BFR = Trésorerie Active − Passive', (bilan.tn || 0) >= 0 ? 'Liquidités nettes disponibles' : 'Tension de trésorerie'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!cols'] = [{ wch: 48 }, { wch: 22 }, { wch: 22 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Bilan Fonctionnel');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 2 BIS : BILAN OFFICIEL SCF (ACTIF / PASSIF DÉTAILLÉ)
     ────────────────────────────────────────────────────────── */
  const an  = bilanSCF.actifNonCourant || {};
  const acr = bilanSCF.actifCourant || {};
  const cp  = bilanSCF.capitauxPropres || {};
  const pnc = bilanSCF.passifNonCourant || {};
  const pcr = bilanSCF.passifCourant || {};
  const n1SCF = dataN1?.bilanSCF || {};
  const an1  = n1SCF?.actifNonCourant || {};
  const acr1 = n1SCF?.actifCourant || {};

  const zeroLine = { brut: 0, amortProv: 0, net: 0 };
  // Ligne ACTIF officielle SCF : Rubrique | Brut N | Amort./Prov. N | Net N | Net N-1
  const actifRow = (label, line, lineN1) => {
    const l = line || zeroLine;
    return [label, l.brut || 0, l.amortProv || 0, l.net || 0, lineN1?.net ?? ''];
  };
  const sumActifLines = (obj) => Object.keys(obj || {}).filter(k => k !== 'total')
    .reduce((s, k) => ({ brut: s.brut + (obj[k].brut || 0), amortProv: s.amortProv + (obj[k].amortProv || 0), net: s.net + (obj[k].net || 0) }), { brut: 0, amortProv: 0, net: 0 });

  const wsBilanSCFData = [
    ['BILAN OFFICIEL — ACTIF / PASSIF (Arrêté du 26/07/2008 — SCF, Loi 07-11, Décret 08-156)'],
    [`Devise : ${currency}`],
    [],
    ['ACTIF NON COURANT', `Brut N (${currency})`, `Amort./Prov. N (${currency})`, `Net N (${currency})`, `Net N-1 (${currency})`],
    actifRow('Écart d\'acquisition (goodwill)', an.ecartAcquisition, an1.ecartAcquisition),
    actifRow('Immobilisations incorporelles', an.immobilisationsIncorporelles, an1.immobilisationsIncorporelles),
    ['  Immobilisations corporelles'],
    actifRow('    Terrains', an.terrains, an1.terrains),
    actifRow('    Bâtiments', an.batiments, an1.batiments),
    actifRow('    Autres immobilisations corporelles', an.autresImmoCorp, an1.autresImmoCorp),
    actifRow('    Immobilisations en concession', an.immobilisationsEnConcession, an1.immobilisationsEnConcession),
    actifRow('Immobilisations en cours', an.immobilisationsEnCours, an1.immobilisationsEnCours),
    actifRow('Immobilisations financières', an.immobilisationsFinancieres, an1.immobilisationsFinancieres),
    actifRow('Impôts différés actif', an.impotsDifferesActif, an1.impotsDifferesActif),
    actifRow('TOTAL ACTIF NON COURANT', sumActifLines(an), sumActifLines(an1)),
    [],
    ['ACTIF COURANT', `Brut N (${currency})`, `Amort./Prov. N (${currency})`, `Net N (${currency})`, `Net N-1 (${currency})`],
    actifRow('Stocks et encours', acr.stocks, acr1.stocks),
    ['  Créances et emplois assimilés'],
    actifRow('    Clients', acr.clients, acr1.clients),
    actifRow('    Autres débiteurs', acr.autresDebiteurs, acr1.autresDebiteurs),
    actifRow('    Impôts et assimilés', acr.impotsEtAssimilesActif, acr1.impotsEtAssimilesActif),
    actifRow('    Autres créances et emplois assimilés', acr.autresCreancesEmploisAssimiles, acr1.autresCreancesEmploisAssimiles),
    ['  Disponibilités et assimilés'],
    actifRow('    Placements et autres actifs financiers courants', acr.placements, acr1.placements),
    actifRow('    Trésorerie', acr.tresorerie, acr1.tresorerie),
    actifRow('TOTAL ACTIF COURANT', sumActifLines(acr), sumActifLines(acr1)),
    [],
    ['TOTAL GÉNÉRAL DE L\'ACTIF', '', '', bilanSCF.totalActif || 0, n1SCF?.totalActif || ''],
    [],
    ['CAPITAUX PROPRES', `Exercice N (${currency})`, `Exercice N-1 (${currency})`],
    ['Capital émis', cp.capitalEmis || 0, n1SCF?.capitauxPropres?.capitalEmis || ''],
    ['Capital non appelé (-)', cp.capitalNonAppele || 0, n1SCF?.capitauxPropres?.capitalNonAppele || ''],
    ['Primes et réserves', cp.primesEtReserves || 0, n1SCF?.capitauxPropres?.primesEtReserves || ''],
    ['Écarts de réévaluation', cp.ecartsReevaluation || 0, n1SCF?.capitauxPropres?.ecartsReevaluation || ''],
    ['Résultat net', cp.resultatNet || 0, n1SCF?.capitauxPropres?.resultatNet || ''],
    ['Autres capitaux propres — Report à nouveau', cp.autresCapitauxPropres || 0, n1SCF?.capitauxPropres?.autresCapitauxPropres || ''],
    ['TOTAL I — CAPITAUX PROPRES', cp.total || 0, n1SCF?.capitauxPropres?.total || ''],
    [],
    ['PASSIFS NON COURANTS', `Exercice N (${currency})`, `Exercice N-1 (${currency})`],
    ['Emprunts et dettes financières', pnc.empruntsDettesFinancieres || 0, n1SCF?.passifNonCourant?.empruntsDettesFinancieres || ''],
    ['Impôts (différés et provisionnés)', pnc.impotsDifferesPassif || 0, n1SCF?.passifNonCourant?.impotsDifferesPassif || ''],
    ['Autres dettes non courantes', pnc.autresDettesNonCourantes || 0, n1SCF?.passifNonCourant?.autresDettesNonCourantes || ''],
    ['Provisions et produits constatés d\'avance', pnc.provisionsEtProduitsConstatesAvance || 0, n1SCF?.passifNonCourant?.provisionsEtProduitsConstatesAvance || ''],
    ['TOTAL II — PASSIFS NON COURANTS', pnc.total || 0, n1SCF?.passifNonCourant?.total || ''],
    [],
    ['PASSIFS COURANTS', `Exercice N (${currency})`, `Exercice N-1 (${currency})`],
    ['Fournisseurs et comptes rattachés', pcr.fournisseurs || 0, n1SCF?.passifCourant?.fournisseurs || ''],
    ['Impôts', pcr.impotsEtAssimilesPassif || 0, n1SCF?.passifCourant?.impotsEtAssimilesPassif || ''],
    ['Autres dettes', pcr.autresDettes || 0, n1SCF?.passifCourant?.autresDettes || ''],
    ['Trésorerie passif', pcr.tresoreriePassif || 0, n1SCF?.passifCourant?.tresoreriePassif || ''],
    ['TOTAL III — PASSIFS COURANTS', pcr.total || 0, n1SCF?.passifCourant?.total || ''],
    [],
    ['TOTAL GÉNÉRAL DU PASSIF (I + II + III)', bilanSCF.totalPassif || 0, n1SCF?.totalPassif || ''],
  ];
  const wsBilanSCF = XLSX.utils.aoa_to_sheet(wsBilanSCFData);
  wsBilanSCF['!cols'] = [{ wch: 48 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsBilanSCF, 'Bilan Officiel SCF');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 3 : COMPTE DE RÉSULTAT (TCR / SIG)
     ────────────────────────────────────────────────────────── */
  // Source unique de vérité (partagée avec SIGView et EtatsFinanciersView) pour la numérotation
  // officielle I à X — évite toute divergence entre l'écran et cette feuille.
  const tcrObservations = {
    '70': 'Base d\'activité', '72': 'Production stockée/déstockée (MIXTE)',
    '73': 'Travaux faits par l\'entreprise pour elle-même', '74': 'Aides d\'exploitation',
    'I': 'Activité brute globale', '60': 'Consommations directes',
    '61/62': 'Prestations & sous-traitance', 'II': 'Charges consommées',
    'III': 'Richesse nette créée', '63': 'Masse salariale',
    '64': 'Taxes d\'exploitation', 'IV': 'Ressource brute d\'exploitation',
    '75': 'Revenus divers', '65': 'Charges diverses',
    '68': 'Dépréciation du capital', '78': 'Annulations de provisions',
    'V': 'Performance pure d\'activité', '76': 'Placements & gains',
    '66': 'Intérêts d\'emprunts', 'VI': 'Coût net de l\'endettement',
    'VII': 'Résultat courant', '692/693/695/698': `Taux légal: ${secteur.tauxIBS}`,
    'VIII': 'Bénéfice ordinaire', '77': 'Événements exceptionnels', '67': 'Événements exceptionnels',
    'IX': 'Solde des éléments extraordinaires', 'X': 'Bénéfice net distribuable',
  };
  const ca = sig.chiffreAffaires || 1;
  const ws3Data = [
    ['TABLEAU DES COMPTES DE RÉSULTATS — TCR PAR NATURE (SCF)'],
    ['Nomenclature officielle Système Comptable Financier — Arrêté du 26/07/2008'],
    [],
    ['Code', 'Rubrique du Compte de Résultat', `Montant N (${currency})`, '% du CA', 'Observations'],
    ...buildTCRRows(sig).map(r => {
      const val = r.isCharge && r.val > 0 ? -r.val : (r.val || 0);
      const pct = r.code === '70' ? '100.0%' : (r.type === 'compte' && (r.code === '75' || r.code === '65' || r.code === '68' || r.code === '78' || r.code === '76' || r.code === '66' || r.code === '77' || r.code === '67') ? '' : `${((val / ca) * 100).toFixed(1)}%`);
      return [r.code, r.label, val, pct, tcrObservations[r.code] || ''];
    }),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
  ws3['!cols'] = [{ wch: 10 }, { wch: 48 }, { wch: 22 }, { wch: 15 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'TCR & SIG');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 3 BIS : TABLEAU DE VARIATION DES CAPITAUX PROPRES (TVCP)
     ────────────────────────────────────────────────────────── */
  const tvcpHeader = ['Mouvement', ...tvcp.colonnes.map(c => `${c.label} (${currency})`)];
  const wsTvcpData = [
    ['TABLEAU DE VARIATION DES CAPITAUX PROPRES (TVCP) — SCF'],
    [`Devise : ${currency}`],
    [],
    tvcpHeader,
    ...tvcp.lignes.map(l => [l.libelle, ...tvcp.colonnes.map(c => l[c.key] || 0)]),
    [],
    ['SYNTHÈSE', `Montant (${currency})`],
    ['Capitaux propres à l\'ouverture', tvcp.kpis.totalDebut || 0],
    ['Capitaux propres à la clôture', tvcp.kpis.totalFin || 0],
    ['Variation nette de l\'exercice', tvcp.kpis.variationNette || 0],
    ['Résultat net de l\'exercice', tvcp.kpis.resultatNet || 0],
    ['Dividendes estimés (N-1)', tvcp.kpis.dividendesEstimes || 0],
  ];
  const wsTvcp = XLSX.utils.aoa_to_sheet(wsTvcpData);
  wsTvcp['!cols'] = [{ wch: 48 }, ...tvcp.colonnes.map(() => ({ wch: 20 }))];
  XLSX.utils.book_append_sheet(wb, wsTvcp, 'TVCP');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 3 TER : TABLEAU DES FLUX DE TRÉSORERIE (TFT) — MÉTHODE INDIRECTE
     ────────────────────────────────────────────────────────── */
  const wsTftData = tft.hasN1 ? [
    ['TABLEAU DES FLUX DE TRÉSORERIE (TFT) — MÉTHODE INDIRECTE — SCF'],
    [`Devise : ${currency}`],
    [],
    ['RUBRIQUE', `Montant N (${currency})`],
    ["A. FLUX DE TRÉSORERIE LIÉS À L'ACTIVITÉ"],
    ["Capacité d'Autofinancement (CAF)", tft.activite.caf],
    ['Variation du Besoin en Fonds de Roulement (BFR)', -tft.activite.variationBFR],
    ["FLUX NET DE TRÉSORERIE LIÉ À L'ACTIVITÉ (A)", tft.activite.total],
    [],
    ["B. FLUX DE TRÉSORERIE LIÉS AUX OPÉRATIONS D'INVESTISSEMENT"],
    ["Acquisitions / Cessions d'immobilisations (variation brute)", -tft.investissement.variationImmo],
    ['FLUX NET DE TRÉSORERIE LIÉ AUX INVESTISSEMENTS (B)', tft.investissement.total],
    [],
    ['C. FLUX DE TRÉSORERIE LIÉS AUX OPÉRATIONS DE FINANCEMENT'],
    ['Augmentation de capital / apports', tft.financement.augmentationCapital],
    ['Emprunts souscrits / remboursés (variation nette)', tft.financement.variationDette],
    ['Dividendes versés (estimation)', -tft.financement.dividendesVerses],
    ['FLUX NET DE TRÉSORERIE LIÉ AU FINANCEMENT (C)', tft.financement.total],
    [],
    ['SYNTHÈSE'],
    ['VARIATION DE TRÉSORERIE DE LA PÉRIODE (A + B + C)', tft.variationTresorerie],
    ["Trésorerie Nette à l'Ouverture (N-1)", tft.tresorerieOuverture],
    ['Trésorerie Nette de Clôture Théorique (Ouverture + Variation)', tft.tresorerieClotureTheorique],
    ['Écart de rapprochement (mouvements de capitaux propres non détaillés)', tft.ecartRapprochement],
    ['Trésorerie Nette de Clôture Réelle (Bilan Fonctionnel)', tft.tresorerieClotureReelle],
  ] : [
    ['TABLEAU DES FLUX DE TRÉSORERIE (TFT) — MÉTHODE INDIRECTE — SCF'],
    [],
    ['Exercice N-1 requis : importez la balance de l\'exercice précédent depuis l\'onglet Importation pour activer ce tableau.'],
  ];
  const wsTft = XLSX.utils.aoa_to_sheet(wsTftData);
  wsTft['!cols'] = [{ wch: 62 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsTft, 'TFT');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 4 : RATIOS & BENCHMARKS SECTORIELS
     ────────────────────────────────────────────────────────── */
  const ws4Data = [
    ['RATIOS FINANCIERS & BENCHMARKS SECTORIELS (ALGÉRIE)'],
    ['Secteur de référence :', secteur.label],
    [],
    ['Indicateur / Ratio', 'Valeur Mesurée', 'Norme Sectorielle Algérie', 'Statut', 'Formule de Calcul'],
    ['Marge EBE (% du CA)', `${(((sig.ebe || 0) / (sig.chiffreAffaires || 1)) * 100).toFixed(1)}%`, bm.margeEBE.norme, (sig.ebe || 0) / (sig.chiffreAffaires || 1) >= bm.margeEBE.bon ? 'OPTIMAL' : 'À AMÉLIORER', 'EBE / CA'],
    ['Marge Nette (% du CA)', `${(((sig.resultatNet || 0) / (sig.chiffreAffaires || 1)) * 100).toFixed(1)}%`, bm.margeNette.norme, (sig.resultatNet || 0) > 0 ? 'CONFORME' : 'DÉFICIT', 'Résultat Net / CA'],
    ['Taux de Valeur Ajoutée', `${(((sig.valeurAjoutee || 0) / (sig.chiffreAffaires || 1)) * 100).toFixed(1)}%`, bm.tauxVA.norme, (sig.valeurAjoutee || 0) / (sig.chiffreAffaires || 1) >= bm.tauxVA.bon ? 'OPTIMAL' : 'MOYEN', 'Valeur Ajoutée / CA'],
    ['Liquidité Générale', `${(ratios.liquiditeGenerale || 0).toFixed(2)}x`, bm.liquiditeGenerale.norme, (ratios.liquiditeGenerale || 0) >= bm.liquiditeGenerale.bon ? 'SOLIDE' : 'ATTENTION', '(Actif Circulant + Trésorerie) / Passif Court Terme'],
    ['Autonomie Financière', `${(((ratios.autonomieFinanciere || 0)) * 100).toFixed(1)}%`, bm.autonomieFinanciere.norme, (ratios.autonomieFinanciere || 0) >= bm.autonomieFinanciere.bon ? 'SOLIDE' : 'VULNÉRABLE', 'Capitaux Propres / Total Bilan'],
    ['Délai Recouvrement Clients (DSO)', `${Math.round(ratios.delaiRecouvrement || 0)} jours`, bm.dso.norme, (ratios.delaiRecouvrement || 0) <= bm.dso.bon ? 'OPTIMAL' : 'LENT', `(Créances Clients / CA${ratios.tvaCorrectionAppliquee && !ratios.tvaCorrectionAppliquee.ventesFranchisees ? ` TTC ${ratios.tvaCorrectionAppliquee.tauxTva}%` : ''}) × 360`],
    ['Délai Paiement Fournisseurs (DPO)', `${Math.round(ratios.delaiFournisseurs || 0)} jours`, bm.dpo.norme, 'CONFORME', `(Dettes Fournisseurs / Consommations${ratios.tvaCorrectionAppliquee && !ratios.tvaCorrectionAppliquee.achatsFranchises ? ` TTC ${ratios.tvaCorrectionAppliquee.tauxTva}%` : ''}) × 360`],
    ['Rotation des Stocks', `${Math.round(ratios.rotationStocks || 0)} jours`, bm.rotationStocks.norme, (ratios.rotationStocks || 0) <= bm.rotationStocks.bon ? 'OPTIMAL' : 'LENT', '(Stock Moyen / Achats) × 360'],
    ['BFR en Jours de CA', `${Math.round(ratios.bfrJoursCA || 0)} j CA`, bm.bfrJoursCA.norme, (ratios.bfrJoursCA || 0) <= bm.bfrJoursCA.bon ? 'MAÎTRISÉ' : 'ÉLEVÉ', '(BFR / CA) × 360'],
    ['Productivité du Travail', `${(sig.valeurAjoutee && sig.chargesPersonnel ? (sig.valeurAjoutee / sig.chargesPersonnel).toFixed(2) : '1.50')}x`, bm.productivite.norme, 'ÉVALUÉ', 'Valeur Ajoutée / Charges de Personnel'],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
  ws4['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Ratios & Benchmarks');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 5 : AUDIT DES FLUX CROISÉS & NATURES SCF
     ────────────────────────────────────────────────────────── */
  const ws5Data = [
    ['AUDIT DE CONFORMITÉ SCF & CONTRÔLE DES FLUX CROISÉS'],
    ['Score Global de Conformité :', `${auditNatures.scoreCoherence} %`],
    [],
    ['1. CONTRÔLE DES JEUX D\'ÉCRITURES ET FLUX CROISÉS (7 RÈGLES SCF)'],
    ['Cycle', 'Règle de Contrôle', 'Statut', `Montant Source (${currency})`, `Montant Cible (${currency})`, `Écart (${currency})`, 'Diagnostic'],
  ];
  (auditFlux.regles || []).forEach(r => {
    ws5Data.push([
      r.cycle || '',
      r.titre || '',
      r.statut || '',
      Math.round(r.sourceVal || 0),
      Math.round(r.cibleVal || 0),
      Math.round(r.ecart || 0),
      r.explication || ''
    ]);
  });

  ws5Data.push([]);
  ws5Data.push(['2. RELEVÉ DES ANOMALIES DE SOLDES INVERSÉS (CLASSES 1 À 7)']);
  ws5Data.push(['Compte', 'Intitulé du Compte', `Solde Débiteur (${currency})`, `Solde Créditeur (${currency})`, 'Statut SCF', 'Observation Normative']);

  const anomaliesNatures = (auditNatures.comptesAudit || []).filter(c => c.verification?.statut === 'ANOMALIE' || c.verification?.statut === 'ATYPIQUE');
  if (anomaliesNatures.length === 0) {
    ws5Data.push(['—', 'Aucune anomalie détectée sur l\'ensemble des comptes mouvementés.', 0, 0, 'CONFORME', 'Respect intégral des règles de soldes normaux SCF']);
  } else {
    anomaliesNatures.forEach(c => {
      ws5Data.push([
        c.compte || '',
        c.libelle || '',
        Math.round(c.deb || 0),
        Math.round(c.cred || 0),
        c.verification?.statut || '',
        c.verification?.diagnostic || ''
      ]);
    });
  }

  const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
  ws5['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'Audit SCF');

  /* ──────────────────────────────────────────────────────────
     FEUILLE 6 : GRAND LIVRE & BALANCE GÉNÉRALE
     ────────────────────────────────────────────────────────── */
  const ws6Data = [
    ['BALANCE GÉNÉRALE DES COMPTES (GRAND LIVRE)'],
    ['Compte', 'Intitulé du Compte', 'Solde Début Débit', 'Solde Début Crédit', 'Mouvement Débit', 'Mouvement Crédit', 'Solde Fin Débit', 'Solde Fin Crédit'],
  ];

  let totSD = 0, totSC = 0, totMD = 0, totMC = 0, totFD = 0, totFC = 0;

  (rows || []).forEach(r => {
    const sd = Number(r.soldeDebutDebit) || 0;
    const sc = Number(r.soldeDebutCredit) || 0;
    const md = Number(r.mouvementDebit) || 0;
    const mc = Number(r.mouvementCredit) || 0;
    const fd = Number(r.soldeFinDebit) || 0;
    const fc = Number(r.soldeFinCredit) || 0;

    totSD += sd; totSC += sc; totMD += md; totMC += mc; totFD += fd; totFC += fc;

    ws6Data.push([
      r.compte || '',
      r.libelle || '',
      sd, sc, md, mc, fd, fc
    ]);
  });

  // Ligne de Totaux de contrôle
  ws6Data.push([
    'TOTAL GÉNÉRAL', 'Contrôle d\'équilibrage de balance',
    totSD, totSC, totMD, totMC, totFD, totFC
  ]);

  const ws6 = XLSX.utils.aoa_to_sheet(ws6Data);
  ws6['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws6, 'Balance des Comptes');

  // Téléchargement du fichier .xlsx
  XLSX.writeFile(wb, filename);
  return true;
}

