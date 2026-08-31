import { useState, useMemo } from 'react';

// Bandes de couleur pour les intervalles d'interprétation — mêmes codes sémantiques
// que le reste de l'application (vert = favorable, ambre = vigilance, rouge = risque).
const STATUS_STYLE = {
  ok:      { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: 'check_circle' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: 'warning' },
  danger:  { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: 'error' },
  neutral: { bg: 'var(--surface-alt)', border: 'var(--border)', color: 'var(--text-muted)', icon: 'info' },
};

const FORMULAS_DATABASE = [
  // ══════════════════════════════════════════════════════
  // 1. BILAN & ÉQUILIBRE FINANCIER
  // ══════════════════════════════════════════════════════
  {
    id: 'bilan_actif_passif',
    category: 'bilan',
    titre: 'Équilibre Fondamental du Bilan SCF',
    reference: 'SCF — Loi 07-11 du 25/11/2007, art. 17 ; Décret exécutif 08-156 du 26/05/2008',
    formule: 'TOTAL ACTIF = TOTAL PASSIF',
    comptes: 'Actif : Classes 2 + 3 + 4 (soldes débiteurs) + 5 (soldes débiteurs) | Passif : Classe 1 + 4 (soldes créditeurs) + 5 (soldes créditeurs)',
    explication: 'L\'Actif recense l\'ensemble des emplois (ce que possède et utilise l\'entreprise : immobilisations, stocks, créances, disponibilités) et le Passif recense l\'ensemble des ressources qui ont financé ces emplois (capitaux propres apportés ou accumulés, dettes financières et d\'exploitation). Cette égalité découle directement du principe de la partie double : chaque écriture comptabilisée au débit d\'un compte a nécessairement sa contrepartie au crédit d\'un autre, pour un montant strictement identique.',
    interpretation: 'Cette égalité n\'est pas un indicateur de performance à proprement parler — c\'est un contrôle de cohérence absolu. Un écart, aussi faible soit-il, signale systématiquement une erreur de saisie, un compte mal classé (actif/passif inversé) ou une balance mal extraite, jamais une situation économique réelle. C\'est le premier contrôle qu\'effectue l\'application avant tout calcul (module Audit Balance).',
    intervalles: [
      { label: 'Écart = 0,00 DA', status: 'ok', desc: 'Balance équilibrée — l\'analyse peut être considérée comme fiable sur le plan arithmétique.' },
      { label: 'Écart ≠ 0,00 DA', status: 'danger', desc: 'Anomalie de saisie ou d\'extraction de balance — à corriger avant toute exploitation des résultats.' },
    ],
    exemple: 'Si Actif = 120 000 000 DA, alors Passif (Capitaux + Dettes) = 120 000 000 DA impérativement.'
  },
  {
    id: 'actifs_immobilises',
    category: 'bilan',
    titre: 'Actifs Non Courants / Immobilisations Nettes',
    reference: 'SCF — Classe 2 du plan de comptes (comptes 20 à 29), Décret exécutif 08-156',
    formule: 'Actifs Non Courants (Net) = Valeur Brute (20 à 27) − Amortissements Cumulés (28) − Pertes de Valeur (29)',
    comptes: '20 (Incorporelles), 21 (Corporelles), 22 (En concession), 23 (En cours), 26/27 (Financières) − 28 (Amortissements) − 29 (Pertes de valeur)',
    explication: 'Représente les biens durables destinés à servir de manière continue à l\'activité de l\'entreprise sur plus d\'un exercice (terrains, constructions, matériel, logiciels, participations financières...). Le montant brut correspond au coût d\'entrée historique ; l\'amortissement (compte 28) traduit la consommation progressive et irréversible de l\'avantage économique de l\'immobilisation, tandis que la dépréciation (compte 29) traduit une perte de valeur non irréversible constatée à la clôture (ex. dépréciation d\'un terrain suite à une baisse de marché).',
    interpretation: 'Un ratio Immobilisations Nettes / Immobilisations Brutes faible (proche de 0) indique un parc d\'actifs largement amorti, susceptible de nécessiter un renouvellement prochain — un signal utile pour anticiper des investissements futurs. À l\'inverse, un ratio proche de 1 indique des actifs récents.',
    intervalles: [
      { label: 'Net / Brut ≥ 60 %', status: 'ok', desc: 'Parc d\'immobilisations récent, capacité de production préservée.' },
      { label: 'Net / Brut entre 30 % et 60 %', status: 'warning', desc: 'Vieillissement modéré — planifier les renouvellements à moyen terme.' },
      { label: 'Net / Brut < 30 %', status: 'danger', desc: 'Parc largement amorti — risque d\'obsolescence et besoin de réinvestissement à court terme.' },
    ],
    exemple: 'Matériel brut : 10 000 000 DA, Amortissement cumulé : 4 000 000 DA ⇒ Valeur nette = 6 000 000 DA (Net/Brut = 60 %).'
  },
  {
    id: 'bilan_officiel_scf',
    category: 'bilan',
    titre: 'Bilan Officiel SCF (Actif / Passif détaillé)',
    reference: 'Arrêté du 26 juillet 2008 fixant les modèles des états financiers (ministère des Finances), pris en application du Décret exécutif 08-156',
    formule: 'Modèle imposé : Actif Non Courant + Actif Courant = Capitaux Propres + Passifs Non Courants + Passifs Courants',
    comptes: 'Ventilation détaillée par rubrique officielle : Écart d\'acquisition (207), Immobilisations (20/21/22/23/26/27), Stocks (3), Clients (41), Capital (10), Réserves (104/106), Emprunts (16), Fournisseurs (40)...',
    explication: 'Contrairement au Bilan Fonctionnel (analyse FRNG/BFR/TN, un outil de pilotage interne), le Bilan Officiel reprend rubrique par rubrique le modèle exact publié par l\'arrêté du 26 juillet 2008 — c\'est la présentation exigée pour un dépôt légal ou une communication à un tiers (banque, actionnaire, administration fiscale). Chaque poste de l\'Actif Non Courant y est présenté en trois colonnes : Brut, Amortissements/Provisions, Net — conformément au modèle officiel.',
    interpretation: 'Ce n\'est pas un indicateur en soi mais le cadre de présentation légal : sa seule exigence est l\'équilibre Actif = Passif (voir « Équilibre Fondamental du Bilan SCF » ci-dessus) et la conformité de la ventilation par rubrique aux comptes réellement mouvementés dans la balance.',
    intervalles: [
      { label: 'Bilan équilibré', status: 'ok', desc: 'Total Actif = Total Passif à la rubrique près — document conforme pour dépôt ou communication externe.' },
      { label: 'Écart de balance détecté', status: 'danger', desc: 'Un compte de classe 1 à 5 n\'a pas pu être classé (ou l\'a été de façon incohérente) — vérifier les comptes atypiques signalés par l\'Audit Balance.' },
    ],
    exemple: 'Onglet « États Financiers (SCF) » de l\'application : Bilan Actif/Passif et Compte de Résultat conformes au modèle officiel, exportables en PDF et Excel.'
  },

  // ══════════════════════════════════════════════════════
  // 2. FRNG, BFR & TRÉSORERIE NETTE
  // ══════════════════════════════════════════════════════
  {
    id: 'frng',
    category: 'bfr',
    titre: 'Fonds de Roulement Net Global (FRNG)',
    reference: 'Méthodologie d\'analyse fonctionnelle du bilan (doctrine comptable, non normée explicitement par le SCF)',
    formule: 'FRNG = Ressources Stables − Emplois Stables',
    comptes: 'Ressources Stables = Capitaux Propres (Classe 1) + Amortissements/Provisions (28, 29) + Dettes Financières LT (16) | Emplois Stables = Actif Immobilisé Brut (Classe 2)',
    explication: 'Mesure l\'excédent de ressources à long terme qui reste à la disposition de l\'entreprise après le financement intégral de ses immobilisations, disponible pour financer le cycle d\'exploitation (stocks, créances clients). C\'est un indicateur de sécurité financière structurelle à moyen/long terme, distinct de la trésorerie immédiate.',
    interpretation: 'Un FRNG élevé n\'est pas systématiquement souhaitable au-delà du BFR à financer : un excédent très supérieur au BFR peut signaler des capitaux immobilisés de façon non optimale (sous-investissement, trésorerie oisive) plutôt qu\'une performance. L\'indicateur doit toujours être lu conjointement avec le BFR — voir la Trésorerie Nette (TN) ci-dessous.',
    intervalles: [
      { label: 'FRNG > BFR (TN positive)', status: 'ok', desc: 'Les ressources stables couvrent intégralement le besoin d\'exploitation — situation de sécurité, marge de manœuvre disponible.' },
      { label: 'FRNG ≈ BFR (TN proche de 0)', status: 'warning', desc: 'Équilibre tendu — toute dégradation du BFR (allongement des délais clients, hausse des stocks) bascule immédiatement en tension de trésorerie.' },
      { label: 'FRNG < 0', status: 'danger', desc: 'Déficit structurel : des investissements durables sont financés par des ressources court terme — situation à corriger en priorité (augmentation de capital, emprunt LT, cession d\'actifs non stratégiques).' },
    ],
    exemple: 'Ressources stables = 50 000 000 DA, Immobilisations brutes = 35 000 000 DA ⇒ FRNG = +15 000 000 DA.'
  },
  {
    id: 'bfr',
    category: 'bfr',
    titre: 'Besoin en Fonds de Roulement (BFR)',
    reference: 'Méthodologie d\'analyse fonctionnelle du bilan (doctrine comptable, non normée explicitement par le SCF)',
    formule: 'BFR = Actif Circulant (Stocks + Créances) − Passif Circulant (Dettes d\'exploitation)',
    comptes: 'Actif Circulant = Stocks (3x) + Clients & Créances (41x, 48x) | Passif Circulant = Fournisseurs (40x) + Dettes fiscales/sociales (42x, 43x, 44x)',
    explication: 'Représente le montant de liquidités nécessaire pour financer le décalage temporaire, inhérent au cycle d\'exploitation, entre les décaissements (achat de matières, paiement des salaires) et les encaissements (règlement des clients). Un BFR négatif (ressource en fonds de roulement) est possible et même recherché dans certains secteurs (grande distribution, où les fournisseurs financent le cycle).',
    interpretation: 'Le BFR doit toujours être rapporté au chiffre d\'affaires (BFR exprimé en jours de CA) pour être comparable dans le temps ou entre entreprises de tailles différentes — un BFR de 17M DA n\'a pas le même sens pour un CA de 50M ou de 500M.',
    intervalles: [
      { label: 'BFR en jours de CA < 30 j', status: 'ok', desc: 'Cycle d\'exploitation court, besoin de financement limité.' },
      { label: 'BFR en jours de CA entre 30 et 60 j', status: 'warning', desc: 'Niveau courant à surveiller, notamment son évolution d\'un exercice à l\'autre.' },
      { label: 'BFR en jours de CA > 60 j', status: 'danger', desc: 'Besoin de financement élevé — analyser séparément la rotation des stocks, le DSO et le DPO pour identifier le poste responsable.' },
    ],
    exemple: 'Stocks (15M) + Clients (20M) − Fournisseurs (18M) = BFR de 17 000 000 DA à financer par le FRNG et/ou la trésorerie.'
  },
  {
    id: 'tresorerie_nette',
    category: 'bfr',
    titre: 'Trésorerie Nette (TN) & Équation d\'Équilibre',
    reference: 'Méthodologie d\'analyse fonctionnelle du bilan (doctrine comptable, non normée explicitement par le SCF)',
    formule: 'TN = FRNG − BFR = Trésorerie Active (512, 53) − Trésorerie Passive (519 Concours bancaires)',
    comptes: 'Actif : Banque (512), Caisse (53), Placements (50) | Passif : Découverts & Concours bancaires courants (519)',
    explication: 'Vérification absolue de la trésorerie disponible : l\'écart FRNG − BFR doit être strictement égal à Disponibilités − Concours bancaires courants, calculés indépendamment l\'un de l\'autre à partir de la même balance. C\'est le triangle d\'équilibre fondamental de l\'analyse fonctionnelle du bilan.',
    interpretation: 'Une TN positive et stable dans le temps est le signe d\'une entreprise qui autofinance son cycle d\'exploitation. Une TN négative n\'est pas nécessairement alarmante si elle reste限 limitée et couverte par des lignes de découvert autorisées et négociées — le risque survient quand elle devient structurelle et croissante.',
    intervalles: [
      { label: 'TN nettement positive', status: 'ok', desc: 'Trésorerie excédentaire — capacité à financer sans recours au crédit court terme, voire à placer les excédents.' },
      { label: 'TN proche de 0', status: 'warning', desc: 'Équilibre tendu, sensible aux variations saisonnières du BFR.' },
      { label: 'TN négative et croissante', status: 'danger', desc: 'Dépendance structurelle aux concours bancaires courants — risque de rupture de trésorerie si les lignes ne sont pas reconduites.' },
    ],
    exemple: 'FRNG (+15M) − BFR (+10M) = TN (+5M DA), cohérent avec un solde en banque de +5 000 000 DA.'
  },

  // ══════════════════════════════════════════════════════
  // 3. SIG & TCR PAR NATURE (SCF ALGÉRIE)
  // ══════════════════════════════════════════════════════
  {
    id: 'marge_commerciale',
    category: 'sig',
    titre: '1. Marge Commerciale (Activité de Négoce)',
    reference: 'Arrêté du 26/07/2008 — Modèle du Compte de Résultat par Nature',
    formule: 'Marge Commerciale = Ventes de Marchandises (700) − Achats de Marchandises Vendues (600 ± Δstock 603)',
    comptes: 'Produits : 700 (Ventes marchandises) | Charges : 600 (Achats marchandises) ± 603 (Variation stock marchandises)',
    explication: 'Indicateur clé des entreprises de distribution et de négoce, mesurant la marge brute dégagée sur la revente en l\'état de marchandises achetées à des tiers, avant prise en compte des charges de structure.',
    interpretation: 'Le taux de marge commerciale (Marge / Ventes) est le premier indicateur à comparer aux pratiques du secteur : un taux nettement inférieur à la norme sectorielle signale soit une politique de prix trop agressive, soit un pouvoir de négociation fournisseur insuffisant.',
    intervalles: [
      { label: 'Taux de marge > 30 %', status: 'ok', desc: 'Marge confortable, typique du commerce de détail spécialisé.' },
      { label: 'Taux de marge entre 15 % et 30 %', status: 'warning', desc: 'Niveau courant en commerce de gros / grande distribution — à comparer au secteur.' },
      { label: 'Taux de marge < 15 %', status: 'danger', desc: 'Marge faible — la rentabilité dépendra fortement de la maîtrise des charges de structure et du volume.' },
    ],
    exemple: 'Ventes 700 = 80 000 000 DA, Coût d\'achat 600/603 = 55 000 000 DA ⇒ Marge = 25 000 000 DA (Taux de marge = 31,25 %).'
  },
  {
    id: 'production_exercice',
    category: 'sig',
    titre: '2. Production de l\'Exercice (Activité Industrielle)',
    reference: 'Arrêté du 26/07/2008 — Modèle du Compte de Résultat par Nature, Rubrique I',
    formule: 'Production = Ventes de Production (701 à 706) + Production Stockée (72 Crédit) − Déstockage PF (72 Débit) + Production Immobilisée (73) + Subventions d\'Exploitation (74)',
    comptes: '701 (Produits finis), 702 (Intermédiaires), 703 (Résiduels), 704/705/706 (Travaux/Services), 72 (Variation stock PF), 73 (Production immobilisée), 74 (Subventions exploitation)',
    explication: 'Mesure l\'activité globale de production réalisée par l\'entreprise au cours de l\'exercice, qu\'elle soit vendue, stockée en produits finis ou conservée pour elle-même (immobilisation d\'une production interne). C\'est le premier agrégat de la cascade officielle des Soldes Intermédiaires de Gestion.',
    interpretation: 'Une production largement supérieure aux ventes de l\'exercice (production stockée forte) traduit un développement du stock de produits finis — à surveiller si elle n\'est pas justifiée par une stratégie commerciale (préparation d\'une saison, nouveau marché), car elle immobilise de la trésorerie.',
    intervalles: [
      { label: 'Production ≈ Ventes de production', status: 'ok', desc: 'Production en phase avec les ventes — flux tendu maîtrisé.' },
      { label: 'Production > Ventes (stockage net)', status: 'warning', desc: 'Accumulation de stocks de produits finis — vérifier la cohérence avec la stratégie commerciale et le risque d\'obsolescence.' },
      { label: 'Production < Ventes (déstockage net)', status: 'neutral', desc: 'Consommation de stocks antérieurs pour honorer les ventes — normal en fin de cycle ou en cas de forte demande ponctuelle.' },
    ],
    exemple: 'Ventes 701 = 60M, Production stockée 72 Crédit = +5M, Déstockage 72 Débit = 0 ⇒ Production de l\'exercice = 65 000 000 DA.'
  },
  {
    id: 'valeur_ajoutee',
    category: 'sig',
    titre: '3. Valeur Ajoutée (VA)',
    reference: 'Arrêté du 26/07/2008 — Modèle du Compte de Résultat par Nature, Rubrique III',
    formule: 'Valeur Ajoutée = (Marge Commerciale + Production de l\'Exercice) − Consommations de l\'Exercice (60 + 61 + 62)',
    comptes: 'Consommations : 60 (Achats consommés), 61 (Services extérieurs), 62 (Autres services extérieurs)',
    explication: 'Richesse brute créée par l\'entreprise du fait de son activité productive propre, après déduction des biens et services achetés à des tiers (matières premières, sous-traitance, énergie, loyers, honoraires...). Elle rémunère ensuite les salariés, l\'État, les prêteurs, les actionnaires et l\'autofinancement — c\'est l\'agrégat central de l\'analyse de la répartition de la richesse.',
    interpretation: 'Le Taux de Valeur Ajoutée (VA / CA) mesure le degré d\'intégration de l\'entreprise dans son processus de production : plus il est élevé, plus l\'entreprise transforme elle-même la matière première (forte intégration verticale), au prix d\'une structure de coûts fixes généralement plus lourde.',
    intervalles: [
      { label: 'Taux de VA > 30 %', status: 'ok', desc: 'Forte création de richesse propre, intégration verticale élevée.' },
      { label: 'Taux de VA entre 15 % et 30 %', status: 'warning', desc: 'Niveau intermédiaire, courant en négoce à valeur ajoutée modérée.' },
      { label: 'Taux de VA < 15 %', status: 'danger', desc: 'Poids très élevé des achats consommés — activité proche du simple négoce, faible marge de manœuvre sur les coûts.' },
    ],
    exemple: 'Production = 65M, Consommations externes = 25M ⇒ VA = 40 000 000 DA (Taux de VA = 61,5 %).'
  },
  {
    id: 'ebe',
    category: 'sig',
    titre: '4. Excédent Brut d\'Exploitation (EBE)',
    reference: 'Arrêté du 26/07/2008 — Modèle du Compte de Résultat par Nature, Rubrique IV',
    formule: 'EBE = Valeur Ajoutée (VA) − Charges de Personnel (63) − Impôts, Taxes & Versements Assimilés (64)',
    comptes: 'Charges : 63 (Salaires, cotisations CNAS, charges sociales) + 64 (TAP, taxes professionnelles, versements assimilés)',
    explication: 'Ressource fondamentale générée par l\'exploitation pure de l\'entreprise, indépendamment de sa politique d\'investissement (amortissements) et de financement (intérêts d\'emprunts). C\'est le premier agrégat purement « cash » de la cascade des SIG — il mesure la performance opérationnelle brute avant tout choix de gestion financière.',
    interpretation: 'La Marge d\'EBE (EBE / CA) est l\'un des ratios les plus surveillés par les banques et investisseurs car il isole la performance industrielle et commerciale pure, non affectée par les choix comptables d\'amortissement ni par la structure de financement — il permet donc de comparer des entreprises financées différemment.',
    intervalles: [
      { label: 'Marge d\'EBE ≥ 12 %', status: 'ok', desc: 'Excellente marge brute d\'exploitation — bonne capacité à absorber amortissements et charges financières.' },
      { label: 'Marge d\'EBE entre 5 % et 12 %', status: 'warning', desc: 'Marge opérationnelle correcte mais à surveiller, notamment en cas d\'endettement significatif.' },
      { label: 'Marge d\'EBE < 5 % ou négative', status: 'danger', desc: 'Exploitation faiblement rentable, voire déficitaire (Insuffisance Brute d\'Exploitation) — situation à traiter en priorité, indépendamment des amortissements et intérêts.' },
    ],
    exemple: 'VA = 40M − Personnel (63 : 18M) − Taxes (64 : 2M) ⇒ EBE = 20 000 000 DA (Marge d\'EBE = 24,3 % pour un CA de 82M).'
  },
  {
    id: 'resultat_exploitation',
    category: 'sig',
    titre: '5. Résultat d\'Exploitation (RE)',
    reference: 'Arrêté du 26/07/2008 — Modèle du Compte de Résultat par Nature, Rubrique V',
    formule: 'RE = EBE + Autres Produits Opérationnels (75) − Autres Charges Opérationnelles (65) + Reprises (78) − Dotations aux Amortissements & Provisions (68)',
    comptes: 'Produits : 75, 78 (Reprises exploitation) | Charges : 65, 68 (Dotations aux amortissements 681)',
    explication: 'Mesure la performance industrielle et commerciale globale après prise en compte de l\'usure du matériel (amortissements) et des risques d\'exploitation identifiés (provisions), mais avant l\'impact de la structure de financement (charges financières) et de la fiscalité.',
    interpretation: 'Un Résultat d\'Exploitation sensiblement inférieur à l\'EBE indique une politique d\'amortissement ou de provisionnement lourde — normal pour une entreprise capitalistique récemment investie, à surveiller si elle traduit plutôt une accumulation de provisions pour risques non résolus.',
    intervalles: [
      { label: 'Marge Opérationnelle (RE/CA) ≥ 8 %', status: 'ok', desc: 'Activité commerciale hautement rentable après charge complète d\'exploitation.' },
      { label: 'Marge Opérationnelle entre 3 % et 8 %', status: 'warning', desc: 'Rentabilité opérationnelle modérée.' },
      { label: 'Marge Opérationnelle < 3 % ou négative', status: 'danger', desc: 'Le résultat d\'exploitation ne couvre plus les charges financières et la fiscalité — risque de résultat net déficitaire.' },
    ],
    exemple: 'EBE (20M) + 75 (1M) − 65 (0,5M) − Dotations 681 (4,5M) = RE de 16 000 000 DA.'
  },
  {
    id: 'resultat_financier',
    category: 'sig',
    titre: '6. Résultat Financier',
    reference: 'Arrêté du 26/07/2008 — Modèle du Compte de Résultat par Nature, Rubrique VI',
    formule: 'Résultat Financier = Produits Financiers (76 + 786) − Charges Financières (66 + 686)',
    comptes: 'Produits : 76 (Intérêts, dividendes reçus, gains de change) | Charges : 66 (Intérêts d\'emprunts, agios, pertes de change)',
    explication: 'Mesure l\'impact de la structure d\'endettement et des placements de trésorerie sur la rentabilité de l\'entreprise, indépendamment de sa performance industrielle et commerciale.',
    interpretation: 'Un résultat financier négatif est normal et attendu pour une entreprise endettée — l\'enjeu n\'est pas qu\'il soit positif mais que l\'EBE le couvre largement (voir « Couverture des Charges Financières »).',
    intervalles: [
      { label: 'Résultat Financier ≥ 0', status: 'ok', desc: 'Produits financiers supérieurs ou égaux aux charges — situation rare, typique d\'une entreprise peu endettée avec trésorerie placée.' },
      { label: 'Résultat Financier négatif mais couvert par l\'EBE', status: 'warning', desc: 'Charge financière normale liée à l\'endettement — vérifier le ratio de couverture (EBE / Charges Financières).' },
      { label: 'Résultat Financier fortement négatif', status: 'danger', desc: 'Poids important des intérêts d\'emprunt — risque d\'absorption d\'une part significative du résultat d\'exploitation.' },
    ],
    exemple: 'Produits financiers (0,2M) − Charges d\'intérêts (1,2M) = Résultat financier de −1 000 000 DA.'
  },
  {
    id: 'resultat_net',
    category: 'sig',
    titre: '7. Résultat Net de l\'Exercice',
    reference: 'Arrêté du 26/07/2008 — Modèle du Compte de Résultat par Nature, Rubriques VII à X (numérotation officielle jusqu\'à X, incluant le Résultat Extraordinaire en IX)',
    formule: 'Résultat Net = Résultat Ordinaire Avant Impôts (RCAI) − Impôts Exigibles & Différés (692/693/695/698) + Résultat Extraordinaire (77 − 67)',
    comptes: 'RCAI = RE + Résultat Financier | Impôts : 695/698 (IBS), 692/693 (impôts différés) | Extraordinaire : 77 − 67',
    explication: 'Bénéfice ou perte finale de l\'exercice, disponible pour l\'entreprise et ses associés (mise en réserve, report à nouveau ou distribution de dividendes). Le modèle officiel SCF isole le Résultat Extraordinaire (rubrique IX) avant d\'aboutir au Résultat Net de l\'Exercice (rubrique X, poste final de la cascade) — ce niveau de détail est repris dans l\'onglet « États Financiers (SCF) » de l\'application.',
    interpretation: 'La Marge Nette (Résultat Net / CA) est l\'indicateur de synthèse ultime mais le moins « pur » : elle intègre tous les choix de gestion (amortissement, financement) et un élément parfois non récurrent (résultat extraordinaire) — elle doit toujours être analysée en complément de l\'EBE et du Résultat d\'Exploitation, pas isolément.',
    intervalles: [
      { label: 'Marge Nette ≥ 5 %', status: 'ok', desc: 'Taux de profit net confortable, capacité de distribution et d\'autofinancement solide.' },
      { label: 'Marge Nette entre 0 % et 5 %', status: 'warning', desc: 'Résultat positif mais marge étroite — sensibilité accrue à une hausse des coûts ou une baisse d\'activité.' },
      { label: 'Marge Nette négative', status: 'danger', desc: 'Exercice déficitaire — le résultat net vient réduire les capitaux propres via le report à nouveau.' },
    ],
    exemple: 'RE (16M) − Financier (1M) = RCAI (15M) − IBS 19 % (2,85M) ⇒ Résultat Net = +12 150 000 DA (aucun élément extraordinaire).'
  },

  // ══════════════════════════════════════════════════════
  // 4. CAPACITÉ D'AUTOFINANCEMENT (CAF)
  // ══════════════════════════════════════════════════════
  {
    id: 'caf_calcul',
    category: 'caf',
    titre: 'Capacité d\'Autofinancement (CAF) — Méthode Soustractive',
    reference: 'Méthode soustractive à partir de l\'EBE, retenue par l\'application (non détaillée explicitement par un article du SCF, dérivée de ses agrégats officiels)',
    formule: 'CAF = EBE + (Autres Produits Opér. 75 − Produits de Cession 752) − (Autres Charges Opér. 65 − VNC Éléments Cédés 652) + Produits Financiers (76) − Charges Financières (66) − Impôts sur Résultats (69)',
    comptes: 'EBE (SIG rubrique IV) + 75 − 752 (produits de cession, exclus) − 65 + 652 (VNC cédés, exclue) + 76 − 66 − 69',
    explication: 'Flux potentiel de trésorerie interne généré par l\'activité courante de l\'entreprise, permettant d\'autofinancer ses investissements, de rembourser ses emprunts et de verser des dividendes — sans recourir à un financement externe supplémentaire. L\'application part de l\'EBE (méthode soustractive) plutôt que du Résultat Net (méthode additive, équivalente en théorie) afin d\'exclure explicitement les éléments non récurrents liés aux cessions d\'immobilisations (compte 752 : produit de cession, compte 652 : valeur nette comptable de l\'élément cédé) — ainsi la CAF calculée ne mesure que la capacité d\'autofinancement liée à l\'activité normale et récurrente, pas à un événement exceptionnel de désinvestissement.',
    interpretation: 'La CAF rapportée aux dettes financières donne une durée théorique de désendettement — un indicateur central pour les banques lors de l\'octroi d\'un crédit à moyen/long terme. Exclure les cessions évite de surestimer artificiellement la capacité d\'autofinancement récurrente d\'une entreprise ayant vendu un actif important sur l\'exercice.',
    intervalles: [
      { label: 'Dettes Financières / CAF ≤ 3 ans', status: 'ok', desc: 'Capacité de remboursement solide — endettement soutenable.' },
      { label: 'Dettes Financières / CAF entre 3 et 4 ans', status: 'warning', desc: 'Niveau limite couramment retenu par les banques comme seuil d\'acceptabilité.' },
      { label: 'Dettes Financières / CAF > 4 ans', status: 'danger', desc: 'Capacité de remboursement insuffisante au regard de l\'endettement — difficulté d\'accès à un nouveau crédit probable.' },
    ],
    exemple: 'EBE (20M) + Produits fin. (0,2M) − Charges fin. (1,2M) − Impôts (2,85M) = CAF de 16 150 000 DA (sans cession d\'immobilisation sur l\'exercice).'
  },

  // ══════════════════════════════════════════════════════
  // 5. CAPITAUX PROPRES (TVCP)
  // ══════════════════════════════════════════════════════
  {
    id: 'tvcp_equation',
    category: 'tvcp',
    titre: 'Tableau de Variation des Capitaux Propres (TVCP)',
    reference: 'SCF — un des 5 états financiers obligatoires (avec Bilan, Compte de Résultat, TFT et Annexe), arrêté du 26/07/2008',
    formule: 'CP Clôture (31 Déc.) = CP Ouverture (1er Janv., dont Résultat N-1) + Augmentations de Capital − Dividendes Distribués (N-1) + Résultat Net (N) ± Autres Variations',
    comptes: '101/108 (Capital), 104/106 (Primes et réserves), 105 (Écarts de réévaluation), 11 (Report à nouveau), 12 (Résultat net)',
    explication: 'Rapproche le patrimoine net de l\'entreprise entre le début et la fin de l\'exercice en traçant explicitement l\'affectation du résultat antérieur décidée en Assemblée Générale Ordinaire (mise en réserve, report à nouveau, distribution de dividendes) et l\'enrichissement net généré par l\'exercice en cours. C\'est un des cinq états financiers que le SCF rend obligatoires (avec le Bilan, le Compte de Résultat, le Tableau des Flux de Trésorerie et l\'Annexe).',
    interpretation: 'Une progression régulière des capitaux propres, alimentée majoritairement par la mise en réserve du résultat plutôt que par des apports de capital externes, est le signe d\'une entreprise qui se développe sur ses fonds propres — un facteur de solidité apprécié par les tiers financiers.',
    intervalles: [
      { label: 'Équilibre matriciel strict', status: 'ok', desc: 'Chaque ligne et chaque colonne du tableau se recoupe exactement (écart = 0,00 DA) — condition nécessaire à la validité du TVCP.' },
      { label: 'Écart matriciel non nul', status: 'danger', desc: 'Incohérence entre les mouvements de la balance et l\'affectation déclarée du résultat N-1 — à vérifier avant publication.' },
    ],
    exemple: 'Ouverture (21,5M) − Dividendes N-1 (2M) + Résultat Net N (+31,8M) = Clôture (51,3M DA).'
  },

  // ══════════════════════════════════════════════════════
  // 6. STOCKS, ROTATION, POSSESSION & PORTAGE
  // ══════════════════════════════════════════════════════
  {
    id: 'stock_moyen_rotation',
    category: 'stocks',
    titre: 'Stock Moyen & Délai d\'Écoulement (Jours)',
    reference: 'Méthodologie usuelle de gestion des stocks et du BFR (non normée par le SCF)',
    formule: 'Stock Moyen = (Stock Initial + Stock Final) / 2  |  Délai d\'Écoulement = (Stock Moyen / Achats Consommés 60) × 360 jours',
    comptes: 'Classe 3 (30, 31, 32, 33, 34, 35) rapportée au Compte 60 (Achats consommés)',
    explication: 'Mesure le nombre moyen de jours pendant lesquels les stocks restent immobilisés en magasin avant d\'être consommés ou vendus. Une rotation lente immobilise du capital et expose au risque d\'obsolescence ; une rotation trop rapide expose au risque de rupture et de perte de ventes.',
    interpretation: 'Le délai « optimal » dépend fortement du secteur (produits frais vs biens d\'équipement) — les bornes ci-dessous constituent un repère général utilisé dans l\'application, à ajuster selon la nature de l\'activité.',
    intervalles: [
      { label: '≤ 15 jours', status: 'danger', desc: 'Risque de rupture de stock — flux très tendu, vulnérable au moindre aléa fournisseur.' },
      { label: '15 à 45 jours', status: 'ok', desc: 'Flux tendu optimal — bon compromis entre disponibilité et immobilisation de capital.' },
      { label: '45 à 90 jours', status: 'warning', desc: 'Stock sécurisé mais capital significativement immobilisé — à surveiller.' },
      { label: '> 90 jours', status: 'danger', desc: 'Sur-stockage — immobilisation de trésorerie importante et risque de dépréciation croissant.' },
    ],
    exemple: 'Stock moyen = 15 000 000 DA, Achats consommés = 90 000 000 DA ⇒ Rotation = (15M / 90M) × 360 = 60 jours.'
  },
  {
    id: 'taux_rotation_stocks',
    category: 'stocks',
    titre: 'Taux de Rotation des Stocks (fois / an)',
    reference: 'Méthodologie usuelle de gestion des stocks (non normée par le SCF) — indicateur complémentaire au délai d\'écoulement',
    formule: 'Taux de Rotation = Achats Consommés (60) / Stock Moyen',
    comptes: 'Compte 60 (Achats consommés) rapporté au Stock Moyen (classe 3)',
    explication: 'Exprime, en nombre de fois par an, la vitesse à laquelle le stock se renouvelle complètement — c\'est l\'inverse conceptuel du délai d\'écoulement exprimé en jours (360 / Taux de Rotation ≈ Délai d\'Écoulement). Les deux indicateurs mesurent la même réalité sous deux formes différentes, utiles selon le contexte de lecture (un directeur logistique raisonne souvent en jours, un contrôleur de gestion en nombre de rotations annuelles).',
    interpretation: 'Un taux de rotation élevé traduit une gestion des stocks dynamique et un besoin de financement réduit, mais un taux extrême peut aussi signaler un stock de sécurité insuffisant, exposant à des ruptures.',
    intervalles: [
      { label: '≥ 8 fois / an (≈ ≤ 45 jours)', status: 'ok', desc: 'Rotation rapide, cohérente avec un flux tendu maîtrisé.' },
      { label: 'Entre 4 et 8 fois / an (≈ 45-90 jours)', status: 'warning', desc: 'Rotation modérée — stock sécurisé mais capital immobilisé de façon significative.' },
      { label: '< 4 fois / an (≈ > 90 jours)', status: 'danger', desc: 'Rotation lente — risque de sur-stockage et d\'obsolescence.' },
    ],
    exemple: 'Achats consommés = 90 000 000 DA, Stock Moyen = 15 000 000 DA ⇒ Taux de Rotation = 6,0 fois / an (≈ 60 jours de délai d\'écoulement).'
  },
  {
    id: 'taux_possession_portage',
    category: 'stocks',
    titre: 'Coût de Possession du Stock & Économie de Portage',
    reference: 'Méthodologie de contrôle de gestion logistique (non normée par le SCF)',
    formule: 'Coût Annuel de Possession = Stock Moyen × Taux Global de Possession (Tp)  |  Gain de Portage = |Δ Stock Déstocké| × Tp',
    comptes: 'Composantes usuelles du Tp : Financier (~5 %) + Entreposage (~3 %) + Manutention (~2 %) + Assurance (~1 %) + Obsolescence (~1 %) = 12 % standard',
    explication: 'Quantifie le coût réel — souvent sous-estimé — d\'entreposage, de surveillance, d\'assurance et d\'immobilisation du capital que représente le stock, ainsi que l\'économie financière récurrente réalisée lors d\'un déstockage (libération de trésorerie et réduction des coûts logistiques associés).',
    interpretation: 'Ce taux composite n\'est pas une norme SCF mais un standard de contrôle de gestion largement utilisé ; il doit idéalement être recalculé avec les taux réels de l\'entreprise (coût de financement effectif, primes d\'assurance réelles) plutôt qu\'avec la valeur par défaut.',
    intervalles: [
      { label: 'Tp < 12 %', status: 'ok', desc: 'Coût de possession maîtrisé, en dessous du standard industriel.' },
      { label: 'Tp entre 12 % et 20 %', status: 'warning', desc: 'Fourchette standard observée dans l\'industrie — normal mais à optimiser si récurrent.' },
      { label: 'Tp > 20 %', status: 'danger', desc: 'Coût de possession élevé — vérifier notamment le taux de financement et le risque d\'obsolescence du stock.' },
    ],
    exemple: 'Stock moyen = 40M DA, Tp = 12 % ⇒ Coût annuel = 4,8M DA. Si déstockage de 10M DA ⇒ Gain de portage = 1,2M DA / an.'
  },
  {
    id: 'consommations_vs_production',
    category: 'stocks',
    titre: 'Consommations Globales (60 + Débit 72) vs Production (70x ± 72)',
    reference: 'SCF — Décret exécutif 08-156, complété par une méthodologie de contrôle anti-surconsommation (analyse de gestion)',
    formule: 'Consommations Totales = (601 + 602 ± 603) + Débit 72  |  Production Totale = (700 à 703) + Crédit 72 − Débit 72',
    comptes: 'Approvisionnements : 601 (Matières premières), 602 (Fournitures), 603 (Variation de stock) | Produits : 70x (Ventes), 72 (Crédit = production stockée / Débit = déstockage de produits finis)',
    explication: 'En analyse de gestion, le débit du compte 72 représente la consommation de stocks de produits finis antérieurs pour assurer les ventes de l\'exercice, tandis que les comptes de la classe 60 représentent les matières effectivement consommées par la production. Rapprocher ces deux flux permet d\'évaluer le rendement matières de l\'atelier de production.',
    interpretation: 'Un ratio de rendement matières (Production / Consommations) qui se dégrade d\'un exercice à l\'autre, sans justification par une évolution du mix produit, est un signal d\'alerte sur un possible gaspillage, coulage ou dérive des process de production.',
    intervalles: [
      { label: 'Rendement stable ou en amélioration', status: 'ok', desc: 'Cohérence maintenue entre consommations et production réalisée.' },
      { label: 'Rendement en légère dégradation', status: 'warning', desc: 'À surveiller sur les prochains exercices avant de conclure à une tendance.' },
      { label: 'Rendement en dégradation marquée', status: 'danger', desc: 'Investiguer une possible surconsommation matières, un gaspillage d\'atelier ou une erreur d\'imputation comptable.' },
    ],
    exemple: 'Consommations matières (14M) + Déstockage PF (2M) = 16 000 000 DA de stocks consommés pour un CA de 30 000 000 DA.'
  },

  // ══════════════════════════════════════════════════════
  // 7. RATIOS FINANCIERS & DÉLAIS
  // ══════════════════════════════════════════════════════
  {
    id: 'ratios_liquidite',
    category: 'ratios',
    titre: 'Ratios de Liquidité (Générale, Réduite, Immédiate)',
    reference: 'Ratios de solvabilité court terme usuels en analyse financière (non normés explicitement par le SCF)',
    formule: 'Liquidité Générale = Actif Circulant / Dettes CT  |  Liquidité Réduite = (Créances + Trésorerie) / Dettes CT  |  Liquidité Immédiate = Trésorerie / Dettes CT',
    comptes: 'Actif Circulant (classes 3+4+5) | Dettes CT = Passif Circulant (40, 42, 43, 44) + Trésorerie Passive (519)',
    explication: 'Mesure la capacité de l\'entreprise à rembourser ses dettes à court terme à l\'aide de ses actifs circulants et disponibilités, avec trois degrés de prudence croissante : la liquidité générale inclut les stocks (les plus lents à convertir en cash), la liquidité réduite les exclut, et la liquidité immédiate ne retient que la trésorerie disponible.',
    interpretation: 'La Liquidité Générale est le ratio le plus regardé par les fournisseurs et créanciers court terme. Un écart important entre liquidité générale et liquidité réduite indique un poids élevé des stocks dans l\'actif circulant, sensible à leur vitesse de rotation réelle (voir « Stock Moyen & Délai d\'Écoulement »).',
    intervalles: [
      { label: 'Liquidité Générale ≥ 2,0', status: 'ok', desc: 'Très satisfaisante — large couverture des dettes court terme.' },
      { label: 'Liquidité Générale entre 1,2 et 2,0', status: 'ok', desc: 'Satisfaisante — situation courante d\'une entreprise saine.' },
      { label: 'Liquidité Générale entre 1,0 et 1,2', status: 'warning', desc: 'Limite — marge de sécurité réduite.' },
      { label: 'Liquidité Générale < 1,0', status: 'danger', desc: 'Alerte de sous-liquidité — l\'actif circulant ne couvre plus les dettes à court terme.' },
    ],
    exemple: 'Actif Circulant = 30M, Dettes CT = 20M ⇒ Liquidité Générale = 1,50.'
  },
  {
    id: 'autonomie_financiere',
    category: 'ratios',
    titre: 'Autonomie Financière',
    reference: 'Ratio de structure financière usuel, retenu également dans le score de solvabilité Banque d\'Algérie (module BAIQ)',
    formule: 'Autonomie Financière = Capitaux Propres / Total Passif (Bilan)',
    comptes: 'Capitaux Propres (Classe 1, hors dettes financières et provisions) / Total Bilan (Actif = Passif)',
    explication: 'Mesure la part du financement de l\'entreprise assurée par ses propres ressources (capital, réserves, résultats accumulés) par opposition à l\'endettement. C\'est l\'indicateur central de l\'indépendance financière vis-à-vis des créanciers et des banques.',
    interpretation: 'Une autonomie financière élevée renforce la capacité de négociation face aux banques (accès au crédit facilité, taux plus favorables) mais un niveau excessif peut aussi signaler un recours insuffisant à l\'effet de levier de la dette, qui pourrait accroître la rentabilité des capitaux propres (ROE) si le coût de la dette reste inférieur à la rentabilité économique.',
    intervalles: [
      { label: '≥ 50 %', status: 'ok', desc: 'Excellente autonomie — l\'entreprise se finance majoritairement par ses fonds propres.' },
      { label: 'Entre 35 % et 50 %', status: 'ok', desc: 'Bonne autonomie financière.' },
      { label: 'Entre 25 % et 35 %', status: 'warning', desc: 'Acceptable, à surveiller si tendance à la baisse.' },
      { label: '< 25 %', status: 'danger', desc: 'Dépendance élevée aux dettes — capacité d\'endettement supplémentaire réduite.' },
    ],
    exemple: 'Capitaux Propres = 60M DA, Total Bilan = 150M DA ⇒ Autonomie Financière = 40,0 %.'
  },
  {
    id: 'ratios_rentabilite_roe_roa',
    category: 'ratios',
    titre: 'Rentabilité Financière (ROE) & Économique (ROA)',
    reference: 'Indicateurs usuels de performance actionnariale (littérature financière, non normés par le SCF)',
    formule: 'ROE (Return on Equity) = Résultat Net / Capitaux Propres  |  ROA (Return on Assets) = Résultat Net / Total Bilan',
    comptes: 'Résultat Net (Compte 12) | Capitaux Propres (Classe 1) | Total Bilan (Actif)',
    explication: 'Le ROE mesure le rendement des capitaux investis par les associés/actionnaires — l\'indicateur de référence pour un investisseur. Le ROA mesure l\'efficacité globale de l\'ensemble des actifs de l\'entreprise, indépendamment de la façon dont ils sont financés (dette ou capitaux propres).',
    interpretation: 'Un ROE nettement supérieur au ROA indique un effet de levier financier positif (la dette contribue à la rentabilité des actionnaires) — à condition que le coût de la dette reste inférieur à la rentabilité économique des actifs, sans quoi l\'effet de levier devient défavorable.',
    intervalles: [
      { label: 'ROE ≥ 15 %', status: 'ok', desc: 'Excellente rentabilité pour les investisseurs.' },
      { label: 'ROE entre 10 % et 15 %', status: 'ok', desc: 'Rentabilité correcte, dans la norme des attentes d\'un investisseur.' },
      { label: 'ROE entre 0 % et 10 %', status: 'warning', desc: 'Rentabilité modeste — à comparer au coût d\'opportunité du capital et aux taux d\'emprunt.' },
      { label: 'ROE négatif', status: 'danger', desc: 'Destruction de valeur pour les actionnaires sur l\'exercice.' },
    ],
    exemple: 'Résultat Net = 12M DA, Capitaux Propres = 60M DA ⇒ ROE = 20,0 %.'
  },
  {
    id: 'solvabilite_generale',
    category: 'ratios',
    titre: 'Solvabilité Générale',
    reference: 'Ratio de structure usuel, retenu également dans le calcul du statut de crédit bancaire (module BAIQ)',
    formule: 'Solvabilité Générale = Total Actif / Total Dettes Exigibles (Dettes CT + Dettes Financières LT)',
    comptes: 'Total Actif (Bilan) / (Passif Circulant + Trésorerie Passive + Dettes Financières LT — Compte 16)',
    explication: 'Mesure la capacité théorique de l\'entreprise à honorer l\'ensemble de ses dettes (court et long terme) en cas de liquidation totale de son actif — un test de solvabilité globale distinct de la liquidité (qui ne teste que le court terme).',
    interpretation: 'Ce ratio est particulièrement examiné par les créanciers en cas de doute sur la continuité d\'exploitation ; en gestion courante, la liquidité et la couverture des charges financières restent des indicateurs plus opérationnels.',
    intervalles: [
      { label: '≥ 2,0', status: 'ok', desc: 'Entreprise solvable — l\'actif couvre largement l\'ensemble des dettes exigibles.' },
      { label: 'Entre 1,5 et 2,0', status: 'warning', desc: 'Situation limite — marge de sécurité réduite en cas de dépréciation d\'actifs.' },
      { label: '< 1,5', status: 'danger', desc: 'Risque d\'insolvabilité — l\'actif ne couvre plus confortablement les dettes.' },
    ],
    exemple: 'Total Actif = 150M DA, Dettes Exigibles = 65M DA ⇒ Solvabilité Générale = 2,31.'
  },
  {
    id: 'couverture_charges_financieres',
    category: 'ratios',
    titre: 'Couverture des Charges Financières',
    reference: 'Ratio bancaire usuel, également l\'un des 4 critères du score Banque d\'Algérie sur 20 points (module BAIQ)',
    formule: 'Couverture des Charges Financières = EBE / Charges Financières (Compte 66)',
    comptes: 'Excédent Brut d\'Exploitation (voir SIG rubrique IV) / Charges financières (66, 686)',
    explication: 'Mesure combien de fois l\'EBE (la ressource brute générée par l\'exploitation) couvre le coût de la dette financière — c\'est l\'indicateur central examiné par une banque avant d\'accorder un nouveau crédit, car il mesure directement la marge de sécurité avant que le service de la dette ne devienne intenable.',
    interpretation: 'Un ratio proche de 1 signifie que la quasi-totalité de l\'EBE est absorbée par les seuls intérêts d\'emprunts, ne laissant aucune marge pour le remboursement du capital, les investissements ou la fiscalité — situation critique pour la pérennité.',
    intervalles: [
      { label: '≥ 5,0x', status: 'ok', desc: 'Couverture excellente — charge de la dette très largement absorbée par l\'exploitation.' },
      { label: 'Entre 3,0x et 5,0x', status: 'ok', desc: 'Couverture large, jugée favorable par la plupart des établissements bancaires.' },
      { label: 'Entre 2,0x et 3,0x', status: 'warning', desc: 'Couverture suffisante mais à surveiller.' },
      { label: '< 2,0x', status: 'danger', desc: 'Tension de charge financière — risque de difficulté à honorer le service de la dette.' },
    ],
    exemple: 'EBE = 20M DA, Charges financières = 2M DA ⇒ Couverture = 10,0x (large couverture).'
  },
  {
    id: 'delais_clients_fournisseurs',
    category: 'ratios',
    titre: 'Délais Clients (DSO) & Délais Fournisseurs (DPO)',
    reference: 'Délais de rotation du BFR — méthodologie usuelle, avec correction TTC/HT propre à l\'application (cf. régime de TVA déclaré)',
    formule: 'DSO = (Créances Clients 411 / CA) × 360 j  |  DPO = (Dettes Fournisseurs 401 / Achats) × 360 j',
    comptes: 'Compte 411 (Clients) vs Chiffre d\'affaires (70) | Compte 401 (Fournisseurs) vs Achats (60)',
    explication: 'Mesure le temps moyen mis par les clients pour régler leurs factures (DSO — Days Sales Outstanding) et le délai moyen que l\'entreprise obtient de ses fournisseurs (DPO — Days Payable Outstanding). Les soldes de balance des comptes 411/401 étant enregistrés TTC alors que le CA et les achats du Compte de Résultat sont HT, l\'application corrige automatiquement ce biais selon le régime de TVA déclaré dans les Paramètres (franchisé ou non).',
    interpretation: 'La règle d\'or de la gestion du BFR est que le délai fournisseur doit être supérieur ou au moins égal au délai client, de sorte que le financement du cycle d\'exploitation soit en partie assuré par les fournisseurs plutôt que par la trésorerie propre de l\'entreprise.',
    intervalles: [
      { label: 'DSO ≤ 60 jours', status: 'ok', desc: 'Recouvrement rapide et fluide des créances clients.' },
      { label: 'DSO entre 60 et 90 jours', status: 'warning', desc: 'Délai allongé — surveiller le risque d\'impayés et l\'effet sur le BFR.' },
      { label: 'DSO > 90 jours', status: 'danger', desc: 'Risque d\'immobilisation de cash client important, à traiter (relances, conditions de paiement).' },
      { label: 'DPO entre 30 et 75 jours', status: 'ok', desc: 'Financement fournisseur équilibré.' },
      { label: 'DPO < 30 jours ou > 75 jours', status: 'warning', desc: 'Décalage de règlement à optimiser (trop court : pas d\'effet de levier fournisseur ; trop long : risque relationnel avec les fournisseurs).' },
    ],
    exemple: 'Clients = 15M, CA = 90M ⇒ DSO = 60 jours. Fournisseurs = 12M, Achats = 60M ⇒ DPO = 72 jours (règle d\'or respectée : DPO > DSO).'
  },
  {
    id: 'correction_tva_delais',
    category: 'ratios',
    titre: 'Correction TVA (TTC/HT) sur les Délais Clients & Fournisseurs',
    reference: 'Correction méthodologique interne à l\'application, activée via le régime de TVA déclaré dans les Paramètres (franchisé / non franchisé)',
    formule: 'CA(TTC) = CA × (1 + Taux TVA) si ventes NON franchisées, sinon CA(TTC) = CA  |  Achats(TTC) = Achats × (1 + Taux TVA) si achats NON franchisés, sinon Achats(TTC) = Achats',
    comptes: 'Chiffre d\'affaires (70) et Achats (60), reconstitués en TTC avant division par les soldes de balance Clients (411) et Fournisseurs (401), qui sont eux-mêmes enregistrés TTC',
    explication: 'Les soldes de balance des comptes Clients (411) et Fournisseurs (401) incluent la TVA (ils reflètent le montant réellement facturé/dû), alors que le Chiffre d\'Affaires et les Achats du Compte de Résultat sont enregistrés Hors Taxes. Diviser directement un solde TTC par un montant HT surestime mécaniquement le délai calculé d\'environ le taux de TVA (typiquement 19 % ou 9 %) si l\'activité y est effectivement soumise. L\'application neutralise ce biais en reconstituant un CA et des Achats TTC avant calcul du DSO/DPO, sauf lorsque l\'utilisateur déclare explicitement (dans les Paramètres) que les ventes et/ou les achats sont en franchise de TVA — auquel cas la créance/dette ne porte effectivement aucune TVA et la formule HT/HT d\'origine est la bonne.',
    interpretation: 'Un mauvais réglage du régime de TVA dans les Paramètres (déclarer « franchisé » alors que l\'activité est normalement soumise à TVA, ou l\'inverse) fausse systématiquement le DSO et le DPO affichés d\'environ 15 à 20 % à la hausse ou à la baisse selon le taux applicable — un point de vigilance à vérifier avant toute analyse de délais.',
    intervalles: [
      { label: 'Régime correctement déclaré', status: 'ok', desc: 'DSO/DPO calculés cohérents avec la réalité économique du cycle client/fournisseur.' },
      { label: 'Régime mal déclaré (franchise cochée à tort, ou l\'inverse)', status: 'danger', desc: 'Délais artificiellement faussés d\'environ le taux de TVA applicable (9 % ou 19 %) — à corriger dans les Paramètres.' },
    ],
    exemple: 'CA HT = 90M, TVA 19 % non franchisée ⇒ CA TTC = 107,1M. Avec Clients (balance) = 20M : DSO correct = (20/107,1)×360 ≈ 67 j, contre 80 j si la correction TTC n\'était pas appliquée.'
  },
  {
    id: 'poids_charges_personnel',
    category: 'ratios',
    titre: 'Poids des Charges de Personnel dans la Valeur Ajoutée',
    reference: 'Ratio de partage de la valeur ajoutée usuel en analyse financière (non normé par le SCF)',
    formule: 'Poids Personnel = Charges de Personnel (63) / Valeur Ajoutée (VA)',
    comptes: 'Compte 63 (Charges de personnel) rapporté à la Valeur Ajoutée (SIG rubrique III)',
    explication: 'Mesure la part de la richesse créée par l\'entreprise (la Valeur Ajoutée) qui est redistribuée aux salariés sous forme de rémunérations et charges sociales, avant tout autre poste de répartition (État, prêteurs, actionnaires, autofinancement). C\'est un indicateur clé pour situer l\'intensité en main-d\'œuvre de l\'activité et anticiper l\'effet d\'une variation de la masse salariale sur l\'EBE.',
    interpretation: 'Un poids élevé est normal et attendu pour une activité de services à forte intensité de main-d\'œuvre (conseil, prestations) ; il serait en revanche préoccupant pour une activité industrielle capitalistique où il indiquerait une structure de coûts salariaux disproportionnée par rapport à la richesse créée.',
    intervalles: [
      { label: '< 50 %', status: 'ok', desc: 'Poids modéré — marge de manœuvre préservée pour les autres postes de répartition (impôts, financement, autofinancement).' },
      { label: 'Entre 50 % et 70 %', status: 'warning', desc: 'Poids significatif, courant dans les activités de services — à comparer au secteur.' },
      { label: '> 70 %', status: 'danger', desc: 'Poids très élevé — l\'EBE devient fortement sensible à toute évolution de la masse salariale.' },
    ],
    exemple: 'Charges de personnel (63) = 18M DA, Valeur Ajoutée = 40M DA ⇒ Poids Personnel = 45,0 %.'
  },

  // ══════════════════════════════════════════════════════
  // 8. SOLVABILITÉ, RATING & SCORE DE CRÉDIT
  // ══════════════════════════════════════════════════════
  {
    id: 'altman_zscore',
    category: 'solvabilite',
    titre: 'Score Altman Z\'\' (Modèle EM-Score, Marchés Émergents)',
    reference: 'Edward I. Altman, modèle Z\'\' (1993/2002) adapté aux entreprises privées et marchés émergents — modèle académique international, non spécifique au SCF ni calibré sur données algériennes',
    formule: 'Z\'\' = 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4',
    comptes: 'X1 = FRNG / Total Bilan | X2 = (Réserves + Résultats non distribués) / Total Bilan | X3 = Résultat d\'Exploitation (EBIT) / Total Bilan | X4 = Capitaux Propres / Total Dettes',
    explication: 'Modèle statistique multivarié combinant quatre ratios de structure et de rentabilité en un score unique prédictif du risque de défaillance, initialement conçu par Altman puis adapté (variante Z\'\') pour s\'appliquer aux entreprises non cotées et aux marchés émergents, où les données boursières ne sont pas disponibles.',
    interpretation: 'Ce score est un indicatif académique international, PAS un instrument calibré statistiquement sur des données d\'entreprises algériennes — l\'application l\'affiche à titre de repère complémentaire, jamais comme une probabilité de défaillance certifiée. Lorsque la structure du capital (comptes 10 à 14) n\'est pas détaillée dans la balance importée, une estimation forfaitaire est utilisée et explicitement signalée.',
    intervalles: [
      { label: 'Z\'\' ≥ 2,90 (Rating A+)', status: 'ok', desc: 'Zone saine — excellente solvabilité, risque de défaillance négligeable.' },
      { label: '2,60 ≤ Z\'\' < 2,90 (Rating A)', status: 'ok', desc: 'Zone saine — bonne assise financière, risque faible.' },
      { label: '1,80 ≤ Z\'\' < 2,60 (Rating B+)', status: 'warning', desc: 'Zone de vigilance — structure modérée, risque modéré.' },
      { label: '1,10 ≤ Z\'\' < 1,80 (Rating B)', status: 'warning', desc: 'Zone grise — vulnérabilité financière, risque sensible.' },
      { label: '0 ≤ Z\'\' < 1,10 (Rating C)', status: 'danger', desc: 'Zone de détresse — risque de défaillance élevé.' },
      { label: 'Z\'\' < 0 (Rating D)', status: 'danger', desc: 'Zone critique — insolvabilité avérée sur le plan du modèle.' },
    ],
    exemple: 'X1=0,15, X2=0,20, X3=0,10, X4=1,2 ⇒ Z\'\' = 6,56(0,15) + 3,26(0,20) + 6,72(0,10) + 1,05(1,2) ≈ 3,03 (Rating A+, zone saine).'
  },
  {
    id: 'score_banque_algerie',
    category: 'solvabilite',
    titre: 'Score Banque d\'Algérie (Notation sur 20 points)',
    reference: 'Grille de notation inspirée des pratiques d\'analyse de crédit bancaire en Algérie — méthodologie synthétique interne à l\'application, non un barème officiel publié par la Banque d\'Algérie',
    formule: 'Score /20 = Score Autonomie (/5) + Score Rentabilité (/5) + Score Liquidité (/5) + Score Couverture (/5)',
    comptes: 'Autonomie = Capitaux Propres / Dettes Financières LT | Rentabilité = EBE / CA | Liquidité = Liquidité Générale | Couverture = EBE / Charges Financières',
    explication: 'Grille de notation synthétique à quatre critères (5 points chacun), inspirée des pratiques usuelles d\'analyse de dossier de crédit par les établissements bancaires algériens, combinant autonomie financière, rentabilité, liquidité et capacité de couverture des charges financières en un score global sur 20.',
    interpretation: 'Ce score reste une reconstitution méthodologique à usage indicatif de l\'application — il ne remplace pas l\'analyse propre de chaque banque, qui peut appliquer des critères et pondérations différents selon sa politique de risque interne.',
    intervalles: [
      { label: '≥ 16 / 20', status: 'ok', desc: 'Excellent — dossier de crédit très favorable.' },
      { label: '12 à 16 / 20', status: 'ok', desc: 'Favorable — profil de risque acceptable pour un financement.' },
      { label: '8 à 12 / 20', status: 'warning', desc: 'Vigilance — financement possible sous conditions ou garanties renforcées.' },
      { label: '< 8 / 20', status: 'danger', desc: 'Défavorable — profil de risque élevé pour un octroi de crédit.' },
    ],
    exemple: 'Autonomie 4/5 + Rentabilité 4/5 + Liquidité 5/5 + Couverture 5/5 = 18/20 (Rating « Excellent »).'
  },
  {
    id: 'capacite_endettement',
    category: 'solvabilite',
    titre: 'Capacité d\'Endettement Théorique Additionnelle',
    reference: 'Règle bancaire usuelle (multiple d\'EBE), pratique de marché non codifiée par un texte SCF',
    formule: 'Capacité d\'Endettement Max = (EBE × 3,5) − Dettes Financières LT Actuelles',
    comptes: 'Excédent Brut d\'Exploitation (SIG rubrique IV) et Dettes Financières à Long Terme (Compte 16)',
    explication: 'Estime le montant d\'emprunt supplémentaire que l\'entreprise pourrait théoriquement souscrire tout en respectant la règle prudentielle bancaire usuelle limitant l\'endettement financier à 3,5 fois l\'EBE annuel — un ordre de grandeur utile en amont d\'une négociation de financement, pas un montant garanti par une banque.',
    interpretation: 'Un résultat négatif ou proche de zéro signifie que l\'entreprise a déjà atteint, voire dépassé, le multiple d\'endettement usuellement toléré — tout nouveau financement nécessitera probablement des garanties additionnelles ou une amélioration préalable de l\'EBE.',
    intervalles: [
      { label: 'Capacité additionnelle élevée', status: 'ok', desc: 'Marge d\'endettement confortable au regard de la règle des 3,5x EBE.' },
      { label: 'Capacité additionnelle faible', status: 'warning', desc: 'Marge résiduelle limitée — tout nouvel emprunt significatif rapprochera du seuil prudentiel.' },
      { label: 'Capacité additionnelle négative ou nulle', status: 'danger', desc: 'Endettement financier déjà supérieur au multiple de 3,5x EBE — accès à un nouveau crédit probablement difficile sans garanties supplémentaires.' },
    ],
    exemple: 'EBE = 20M DA, Dettes Financières LT actuelles = 40M DA ⇒ Capacité Max = (20×3,5) − 40 = 30 000 000 DA additionnels théoriques.'
  },
  {
    id: 'score_solvabilite_global',
    category: 'solvabilite',
    titre: 'Score de Solvabilité Global (sur 100)',
    reference: 'Recalibrage interne à l\'application du Score Altman Z\'\' sur une échelle 0-100, à usage de présentation synthétique — non un score bancaire officiel',
    formule: 'Si Z\'\' ≥ 2,6 : Score = 85 + min(15, (Z\'\' − 2,6) × 10)  |  Si 1,1 ≤ Z\'\' < 2,6 : Score = 50 + ((Z\'\' − 1,1) / 1,5) × 35  |  Si Z\'\' < 1,1 : Score = max(0, (Z\'\' / 1,1) × 50)',
    comptes: 'Fonction continue du Score Altman Z\'\' (voir fiche dédiée), sans autre donnée comptable supplémentaire',
    explication: 'Le Score Altman Z\'\' est exprimé dans une échelle mathématique peu intuitive (généralement entre −2 et +8). Ce recalibrage le convertit en un score sur 100, plus lisible pour une synthèse visuelle (jauge, tableau de bord), en conservant la même hiérarchie de risque : les zones « saine », « grise » et « détresse » sont mappées respectivement sur les tranches hautes, médianes et basses de l\'échelle 0-100.',
    interpretation: 'Ce score reste dérivé à 100 % du Z\'\' — il n\'ajoute aucune information nouvelle, seulement une présentation plus accessible. Il hérite donc des mêmes réserves méthodologiques (modèle académique non calibré sur données algériennes).',
    intervalles: [
      { label: '≥ 85 / 100', status: 'ok', desc: 'Correspond à la zone saine du Z\'\' (≥ 2,6) — excellente à bonne solvabilité.' },
      { label: '50 à 85 / 100', status: 'warning', desc: 'Correspond à la zone grise du Z\'\' (1,1 à 2,6) — vulnérabilité modérée à sensible.' },
      { label: '< 50 / 100', status: 'danger', desc: 'Correspond à la zone de détresse du Z\'\' (< 1,1) — risque de défaillance élevé à critique.' },
    ],
    exemple: 'Z\'\' = 3,03 (≥ 2,6) ⇒ Score = 85 + min(15, (3,03−2,6)×10) = 85 + 4,3 = 89,3 / 100.'
  },
  {
    id: 'statut_credit_bancaire',
    category: 'solvabilite',
    titre: 'Statut de Crédit Bancaire (Favorable / Vigilance / Défavorable)',
    reference: 'Grille de décision synthétique interne à l\'application, combinant le Score Altman Z\'\' et le ratio Dette Nette / EBE — inspirée des pratiques d\'analyse de crédit, non un barème officiel',
    formule: 'FAVORABLE si (Dette Nette / EBE ≤ 3,5) ET (Z\'\' ≥ 1,8)  |  VIGILANCE si (Dette Nette / EBE ≤ 5)  |  sinon DÉFAVORABLE',
    comptes: 'Dette Nette = Dettes Financières LT + Dettes Court Terme − Trésorerie Active | Z\'\' = voir fiche Score Altman',
    explication: 'Synthétise en un seul statut à trois niveaux la combinaison de deux angles d\'analyse distincts : la structure de risque globale (Z\'\') et la capacité de remboursement immédiate mesurée par le nombre d\'années d\'EBE nécessaires pour éteindre la dette nette après mobilisation de la trésorerie disponible.',
    interpretation: 'Ce statut est conçu comme une aide à la décision rapide (par exemple avant une demande de financement), pas comme une garantie d\'obtention de crédit — chaque établissement bancaire applique en pratique sa propre grille de risque interne, potentiellement plus ou moins stricte.',
    intervalles: [
      { label: 'FAVORABLE', status: 'ok', desc: 'Dette Nette / EBE ≤ 3,5 ans ET Z\'\' ≥ 1,8 — profil de risque jugé favorable à un financement.' },
      { label: 'VIGILANCE', status: 'warning', desc: 'Dette Nette / EBE ≤ 5 ans (mais critère Z\'\' ou dette non rempli) — financement envisageable sous conditions ou garanties.' },
      { label: 'DÉFAVORABLE', status: 'danger', desc: 'Dette Nette / EBE > 5 ans — profil de risque élevé, accès au crédit probablement difficile en l\'état.' },
    ],
    exemple: 'Dette Nette = 60M, EBE = 20M ⇒ ratio = 3,0 ans. Avec Z\'\' = 2,1 ≥ 1,8 ⇒ Statut = FAVORABLE.'
  },

  // ══════════════════════════════════════════════════════
  // 9. AUDIT BALANCE & RAPPROCHEMENTS SCF
  // ══════════════════════════════════════════════════════
  {
    id: 'audit_classification_nature',
    category: 'audit',
    titre: 'Classification des Comptes : Conforme / Atypique / Anomalie',
    reference: 'Méthodologie d\'audit interne à l\'application, fondée sur le sens normal (débiteur/créditeur) attendu de chaque classe de comptes SCF (Loi 07-11)',
    formule: 'Score de Cohérence = max(0, 100 − (Anomalies × 15 + Atypiques × 5) / (Total Comptes / 10))',
    comptes: 'Chaque compte de la balance (classes 1 à 7) est comparé à son sens normal attendu (ex. compte 53 Caisse : débiteur strict ; compte 40 Fournisseurs : créditeur strict ; compte 44 État : mixte selon créance/dette fiscale)',
    explication: 'Chaque compte du plan SCF possède un sens de solde normalement attendu (débiteur, créditeur, ou mixte selon sa nature). L\'application classe automatiquement chaque ligne de la balance en trois niveaux : CONFORME (sens normal respecté), ATYPIQUE (sens inversé mais explicable par une situation réelle légitime — ex. un compte Client 411 créditeur signifie un acompte reçu, à reclasser en 419), ou ANOMALIE (sens matériellement impossible — ex. une Caisse 53 créditrice, ce qui est comptablement impossible car on ne peut décaisser plus que l\'encaisse disponible).',
    interpretation: 'Une ATYPIE n\'est pas nécessairement une erreur — elle signale souvent un compte qui devrait être reclassé sur son sous-compte miroir (ex. 411→419, 401→409) pour un classement bilan plus précis. Une ANOMALIE, en revanche, est toujours le signe d\'une erreur de saisie ou d\'imputation à corriger avant toute clôture.',
    intervalles: [
      { label: 'Score de Cohérence ≥ 95 %', status: 'ok', desc: 'Excellente régularité de la balance — peu ou pas d\'anomalies.' },
      { label: 'Score de Cohérence entre 80 % et 95 %', status: 'warning', desc: 'Quelques atypies ou anomalies isolées — contrôle ciblé recommandé.' },
      { label: 'Score de Cohérence < 80 %', status: 'danger', desc: 'Contrôle approfondi nécessaire avant d\'exploiter les résultats de l\'analyse financière.' },
    ],
    exemple: '200 comptes, 2 anomalies, 5 atypiques ⇒ Score = 100 − (2×15 + 5×5) / (200/10) = 100 − 55/20 = 97,25 % (excellente régularité).'
  },
  {
    id: 'audit_symetrie_amortissements',
    category: 'audit',
    titre: 'Symétrie Dotations (681) ↔ Amortissements (281)',
    reference: 'Contrôle croisé d\'audit interne à l\'application, fondé sur la logique de partie double du plan de comptes SCF',
    formule: 'Mouvement Débit Compte 681x (Dotation de l\'année) = Mouvement Crédit Compte 281x (Amortissement cumulé)',
    comptes: 'Charges : 681511, 681512, 681513, 681840... | Bilan : 281511, 281512, 281513, 281840...',
    explication: 'Vérifie que chaque dotation d\'amortissement comptabilisée en charge au Compte de Résultat correspond, au centime près, à l\'augmentation de l\'amortissement cumulé constatée au Bilan — un contrôle de cohérence entre les deux états financiers, réalisé automatiquement par rapprochement de suffixe de sous-compte.',
    interpretation: 'Un écart révèle soit une dotation comptabilisée sur un compte 681 sans son 281 correspondant (ou inversement), soit une erreur d\'imputation de sous-compte — dans les deux cas, une correction est nécessaire avant clôture pour que le Bilan et le Compte de Résultat restent cohérents entre eux.',
    intervalles: [
      { label: 'Écart = 0,00 DA', status: 'ok', desc: 'Dotation et amortissement cumulé parfaitement rapprochés — conforme.' },
      { label: 'Écart ≠ 0,00 DA', status: 'danger', desc: 'Anomalie de saisie ou d\'imputation — à corriger avant clôture de l\'exercice.' },
    ],
    exemple: 'Débit 681511 = 1 600 000 DA ⇔ Crédit 281511 = 1 600 000 DA (Écart = 0 DA ⇒ conforme).'
  },
  {
    id: 'audit_liaison_181',
    category: 'audit',
    titre: 'Soldage des Comptes de Liaison (181 / 58)',
    reference: 'Contrôle de clôture usuel, fondé sur la nature transitoire des comptes SCF de liaison et de virement interne',
    formule: 'Solde Fin Débit (181/58) = Solde Fin Crédit (181/58) = 0,00 DA (Mouvements Débit = Mouvements Crédit)',
    comptes: '181 (Comptes de liaison inter-établissements), 58 (Virements internes de fonds)',
    explication: 'Les comptes de virements de fonds et de liaison entre établissements sont par nature transitoires : ils enregistrent temporairement un mouvement en cours de transfert et doivent impérativement être soldés à zéro à la clôture de l\'exercice, faute de quoi ils traduisent un mouvement resté incomplet.',
    interpretation: 'Un solde non nul en clôture sur ces comptes est toujours une anomalie bloquante (jamais une situation normale), généralement due à un virement enregistré d\'un seul côté ou à un décalage de date entre l\'émission et la réception du virement à cheval sur la clôture.',
    intervalles: [
      { label: 'Solde de clôture = 0,00 DA', status: 'ok', desc: 'Compte correctement soldé — conforme.' },
      { label: 'Solde de clôture ≠ 0,00 DA', status: 'danger', desc: 'Anomalie bloquante — mouvement de virement resté incomplet, à régulariser avant l\'arrêté définitif.' },
    ],
    exemple: 'Mouvement Débit 181 = 85 955 423 DA, Mouvement Crédit 181 = 85 955 423 DA ⇒ Solde Fin = 0 DA (conforme).'
  },
];

export function CalculationsIndexView() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const categories = [
    { id: 'all',         label: 'Toutes les sections',        icon: 'apps',                     color: 'var(--primary)' },
    { id: 'bilan',       label: 'Bilan & Équilibre',           icon: 'account_tree',             color: '#1b6e8c' },
    { id: 'bfr',         label: 'FRNG, BFR & Trésorerie',      icon: 'payments',                 color: '#059669' },
    { id: 'sig',         label: 'SIG & TCR par Nature',        icon: 'analytics',                color: '#7c3aed' },
    { id: 'caf',         label: 'CAF & Autofinancement',       icon: 'savings',                  color: '#0891b2' },
    { id: 'tvcp',        label: 'Capitaux Propres (TVCP)',     icon: 'account_balance_wallet',   color: '#d97706' },
    { id: 'stocks',      label: 'Stocks, Possession & Portage',icon: 'warehouse',                color: '#dc2626' },
    { id: 'ratios',      label: 'Ratios & Délais',             icon: 'query_stats',              color: '#4f46e5' },
    { id: 'solvabilite', label: 'Solvabilité & Rating Crédit', icon: 'verified_user',            color: '#be123c' },
    { id: 'audit',       label: 'Audit Balance & Flux',        icon: 'fact_check',               color: '#0284c7' }
  ];

  const filteredFormulas = useMemo(() => {
    return FORMULAS_DATABASE.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      return (
        item.titre.toLowerCase().includes(q) ||
        item.formule.toLowerCase().includes(q) ||
        item.comptes.toLowerCase().includes(q) ||
        item.explication.toLowerCase().includes(q) ||
        item.interpretation.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="fade-in space-y-6">

      {/* ── BANDEAU EN-TÊTE : INDEX DES CALCULS ── */}
      <div style={{ background: 'linear-gradient(135deg, #0b3446 0%, #124f66 100%)', color: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,189,248,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#4fb3cc' }}>menu_book</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>
                Index &amp; Dictionnaire des Règles de Calculs
              </h2>
              <span style={{ fontSize: '0.80rem', color: '#94a3b8' }}>
                Méthodologie SCF (Loi 07-11 / Décret 08-156 / Arrêté du 26/07/2008) — Formules, Interprétation, Intervalles &amp; Références
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '5px 14px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>verified</span>
              {FORMULAS_DATABASE.length} Règles Documentées
            </span>
          </div>
        </div>

        {/* Barre de Recherche Rapide */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 650 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: '#94a3b8' }}>search</span>
          <input
            type="text"
            placeholder="Rechercher une formule, un compte, une référence (ex: EBE, FRNG, 603, Altman, DSO...)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 42px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
              color: '#ffffff', fontSize: '0.85rem', outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          />
        </div>
      </div>

      {/* ── SÉLECTEUR DE CATÉGORIES (BOUTONS INTERACTIFS STYLISÉS) ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {categories.map(cat => {
          const isSel = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                border: isSel ? `1px solid ${cat.color}` : '1px solid var(--border)',
                background: isSel ? 'var(--primary)' : 'var(--surface)',
                color: isSel ? '#ffffff' : 'var(--text)',
                fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: isSel ? '0 4px 12px rgba(37,99,235,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
                transform: isSel ? 'translateY(-1px)' : 'none'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── LISTE DES FORMULES & RÈGLES DE CALCUL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredFormulas.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--border-mid)', display: 'block', marginBottom: 8 }}>search_off</span>
            <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Aucune formule ne correspond à votre recherche</h4>
            <p style={{ fontSize: '0.80rem' }}>Essayez un autre mot-clé ou sélectionnez « Toutes les sections ».</p>
          </div>
        ) : (
          filteredFormulas.map(item => {
            const isExpanded = expandedId === item.id || searchQuery.trim() !== '';

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: isExpanded ? '1px solid var(--primary-lt)' : '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: isExpanded ? '0 6px 18px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Ligne Titre & Badge */}
                <div
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: 12 }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text)' }}>
                      {item.titre}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Bloc Formule Mathématique Mise en Évidence */}
                <div style={{
                  margin: '12px 0', padding: '10px 14px', borderRadius: 8,
                  background: 'var(--surface-alt)', borderLeft: '4px solid var(--primary)',
                  fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)'
                }}>
                  {item.formule}
                </div>

                {/* Détails étendus */}
                {isExpanded && (
                  <div className="fade-in space-y-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: '0.74rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    <div>
                      <strong style={{ color: 'var(--text-sub)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>Référence :</strong>
                      <div style={{ color: '#124f66', fontWeight: 700, marginTop: 3, background: '#f0f8fa', padding: '5px 9px', borderRadius: 6, border: '1px solid #b7dce6', fontSize: '0.72rem' }}>
                        {item.reference}
                      </div>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--text-sub)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>Comptes SCF Associés :</strong>
                      <div style={{ color: 'var(--text)', fontWeight: 600, marginTop: 3, background: 'var(--surface-alt)', padding: '5px 9px', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {item.comptes}
                      </div>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--text-sub)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>Signification &amp; Objectif Financier :</strong>
                      <p style={{ margin: '3px 0 0', color: 'var(--text)', lineHeight: 1.5 }}>
                        {item.explication}
                      </p>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--text-sub)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>Interprétation :</strong>
                      <p style={{ margin: '3px 0 0', color: 'var(--text)', lineHeight: 1.5, fontStyle: 'italic' }}>
                        {item.interpretation}
                      </p>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--text-sub)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Intervalles d'Interprétation :</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {item.intervalles.map((band, bi) => {
                          const st = STATUS_STYLE[band.status] || STATUS_STYLE.neutral;
                          return (
                            <div key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', borderRadius: 6, background: st.bg, border: `1px solid ${st.border}` }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15, color: st.color, flexShrink: 0, marginTop: 1 }}>{st.icon}</span>
                              <div>
                                <span style={{ fontWeight: 800, color: st.color, fontSize: '0.72rem' }}>{band.label}</span>
                                <span style={{ color: st.color, opacity: 0.9 }}> — {band.desc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>💡 Exemple Chiffré :</span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text)', marginTop: 2, fontWeight: 600 }}>{item.exemple}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
