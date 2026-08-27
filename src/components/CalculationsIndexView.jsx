import { useState, useMemo } from 'react';

const FORMULAS_DATABASE = [
  // ══════════════════════════════════════════════════════
  // 1. BILAN & ÉQUILIBRE FINANCIER
  // ══════════════════════════════════════════════════════
  {
    id: 'bilan_actif_passif',
    category: 'bilan',
    titre: 'Équilibre Fondamental du Bilan SCF',
    refSCF: 'SCF Loi 07-11 • Article 17',
    formule: 'TOTAL ACTIF = TOTAL PASSIF',
    comptes: 'Actif : Classes 2 + 3 + 4 (Débiteur) + 5 (Débiteur) | Passif : Classes 1 + 4 (Créditeur) + 5 (Créditeur)',
    explication: 'L\'Actif recense l\'ensemble des emplois (ce que possède l\'entreprise) et le Passif recense l\'ensemble des ressources (l\'origine des capitaux propres et des dettes).',
    exemple: 'Si Actif = 120 000 000 DA, alors Passif (Capitaux + Dettes) = 120 000 000 DA impérativement.',
    norme: 'Écart de bouclage = 0.00 DA.'
  },
  {
    id: 'actifs_immobilises',
    category: 'bilan',
    titre: 'Actifs Non Courants / Immobilisations Nettes',
    refSCF: 'SCF Classe 2 (Comptes 20 à 29)',
    formule: 'Actifs Non Courants = Valeur Brute (20 à 27) - Amortissements & Dépréciations (28 + 29)',
    comptes: '20 (Incorporelles), 21 (Corporelles), 22 (En concession), 23 (En cours), 26/27 (Financières) - 28 (Amortissements) - 29 (Pertes de valeur)',
    explication: 'Représente les biens durables destinés à servir de manière continue à l\'activité de l\'entreprise (durée > 1 an).',
    exemple: 'Matériel brut : 10 000 000 DA, Amortissement cumulé : 4 000 000 DA => Valeur nette = 6 000 000 DA.',
    norme: 'Les amortissements (28) doivent toujours être créditeurs et déduits de l\'actif.'
  },

  // ══════════════════════════════════════════════════════
  // 2. FRNG, BFR & TRÉSORERIE NETTE
  // ══════════════════════════════════════════════════════
  {
    id: 'frng',
    category: 'bfr',
    titre: 'Fonds de Roulement Net Global (FRNG)',
    refSCF: 'Analyse Fonctionnelle du Bilan',
    formule: 'FRNG = Ressources Stables - Emplois Stables',
    comptes: 'Ressources Stables = Capitaux Propres (Classe 1) + Dettes Financières LT (16) | Emplois Stables = Actif Immobilisé Net (Classe 2 nette)',
    explication: 'Mesure l\'excédent de ressources à long terme qui reste à la disposition de l\'entreprise après le financement intégral de ses immobilisations pour financer son cycle d\'exploitation.',
    exemple: 'Ressources stables = 50 000 000 DA, Immobilisations = 35 000 000 DA => FRNG = +15 000 000 DA (Excédent de sécurité).',
    norme: 'FRNG > 0 : Situation saine où les capitaux stables financent du BFR.'
  },
  {
    id: 'bfr',
    category: 'bfr',
    titre: 'Besoin en Fonds de Roulement (BFR)',
    refSCF: 'Cycle d\'Exploitation & Hors Exploitation',
    formule: 'BFR = Actif Circulant (Stocks + Créances) - Passif Circulant (Dettes d\'exploitation)',
    comptes: 'Actif Circulant = Stocks (3x) + Clients & Créances (41x, 48x) | Passif Circulant = Fournisseurs (40x) + Dettes fiscales/sociales (42x, 43x, 44x)',
    explication: 'Représente le montant de liquidités nécessaire pour financer le décalage temporaire entre les décaissements (achats matières, salaires) et les encaissements (ventes clients).',
    exemple: 'Stocks (15M) + Clients (20M) - Fournisseurs (18M) = BFR de 17 000 000 DA à financer.',
    norme: 'Plus le BFR est faible, plus la trésorerie de l\'entreprise est libérée.'
  },
  {
    id: 'tresorerie_nette',
    category: 'bfr',
    titre: 'Trésorerie Nette (TN) & Équation d\'Équilibre',
    refSCF: 'Synthèse de Trésorerie',
    formule: 'TN = FRNG - BFR  OU  TN = Trésorerie Active (512, 53) - Trésorerie Passive (519 Concours bancaires)',
    comptes: 'Actif : Banque (512), Caisse (53), Placements (50) | Passif : Découverts & Concours bancaires courants (519)',
    explication: 'Vérification absolue de la trésorerie disponible. L\'équation FRNG - BFR doit être strictement égale à Disponibilités - Découverts.',
    exemple: 'FRNG (+15M) - BFR (+10M) = TN (+5M DA). Solde en banque : +5 000 000 DA.',
    norme: 'TN > 0 : Trésorerie excédentaire saine | TN < 0 : Dépendance aux crédits de trésorerie.'
  },

  // ══════════════════════════════════════════════════════
  // 3. SIG & TCR PAR NATURE (SCF ALGÉRIE)
  // ══════════════════════════════════════════════════════
  {
    id: 'marge_commerciale',
    category: 'sig',
    titre: '1. Marge Commerciale (Activité de Négoce)',
    refSCF: 'Décret exécutif 08-156 • TCR Rubrique 1',
    formule: 'Marge Commerciale = Ventes de Marchandises (700) - Achats de Marchandises Vendues (600 ± 6030)',
    comptes: 'Produits : 700 (Ventes marchandises) | Charges : 600 (Achats marchandises) ± 6030 (Var. stock marchandises)',
    explication: 'Indicateur clé des entreprises de distribution et de négoce mesurant la marge brute dégagée sur la revente en l\'état.',
    exemple: 'Ventes 700 = 80 000 000 DA, Coût d\'achat 600/603 = 55 000 000 DA => Marge = 25 000 000 DA (Taux de marge = 31.25%).',
    norme: 'Taux de marge = Marge / Ventes 700.'
  },
  {
    id: 'production_exercice',
    category: 'sig',
    titre: '2. Production de l\'Exercice (Activité Industrielle)',
    refSCF: 'Décret exécutif 08-156 • TCR Rubrique 2',
    formule: 'Production = Ventes Production (701 à 706) + Production Stockée (72 Crédit) - Déstockage PF (72 Débit) + Prod. Immobilisée (73) + Subventions (74)',
    comptes: '701 (Produits finis), 702 (Intermédiaires), 703 (Résiduels), 704/705/706 (Travaux/Services), 72 (Variation stock PF), 73 (Production immobilisée), 74 (Subventions exploitation)',
    explication: 'Mesure l\'activité globale de production réalisée par l\'entreprise au cours de l\'exercice, qu\'elle soit vendue, stockée ou conservée pour elle-même.',
    exemple: 'Ventes 701 = 60M, Production stockée 72 Crédit = +5M, Déstockage 72 Débit = 0 => Production de l\'exercice = 65 000 000 DA.',
    norme: 'En cas de déstockage de PF, le 72 débiteur diminue la production de l\'exercice.'
  },
  {
    id: 'valeur_ajoutee',
    category: 'sig',
    titre: '3. Valeur Ajoutée (VA)',
    refSCF: 'Décret exécutif 08-156 • TCR Rubrique 3',
    formule: 'Valeur Ajoutée = (Marge Commerciale + Production de l\'Exercice) - Consommations de l\'Exercice (60 + 61 + 62)',
    comptes: 'Consommations : 60 (Achats consommés), 61 (Services extérieurs), 62 (Autres services extérieurs)',
    explication: 'Richesse brute créée par l\'entreprise du fait de son activité productive propre après déduction des biens et services achetés à des tiers.',
    exemple: 'Production = 65M, Consommations externes = 25M => VA = 40 000 000 DA (Taux de VA = 61.5%).',
    norme: 'Rémunère les salariés, l\'État, les prêteurs, les actionnaires et l\'autofinancement.'
  },
  {
    id: 'ebe',
    category: 'sig',
    titre: '4. Excédent Brut d\'Exploitation (EBE)',
    refSCF: 'Décret exécutif 08-156 • TCR Rubrique 4',
    formule: 'EBE = Valeur Ajoutée (VA) - Charges de Personnel (63) - Impôts, Taxes & Versements (64)',
    comptes: 'Charges : 63 (Salaires, cotisations CNAS, charges sociales) + 64 (TAP, taxes professionnelles)',
    explication: 'Ressource fondamentale générée par l\'exploitation pure de l\'entreprise, indépendamment de sa politique d\'investissement (amortissements) et de financement (intérêts).',
    exemple: 'VA = 40M - Personnel (63: 18M) - Taxes (64: 2M) => EBE = 20 000 000 DA.',
    norme: 'EBE > 0 impératif. Un EBE négatif (Insuffisance Brute) traduit une exploitation déficitaire.'
  },
  {
    id: 'resultat_exploitation',
    category: 'sig',
    titre: '5. Résultat d\'Exploitation (RE)',
    refSCF: 'Décret exécutif 08-156 • TCR Rubrique 5',
    formule: 'RE = EBE + Autres Produits Opérationnels (75) - Autres Charges Opérationnelles (65) + Reprises (78) - Dotations Amortissements & Provisions (68)',
    comptes: 'Produits : 75, 78 (Reprises exploitation) | Charges : 65, 68 (Dotations aux amortissements 681)',
    explication: 'Mesure la performance industrielle et commerciale globale après prise en compte de l\'usure du matériel (amortissements) et des risques d\'exploitation (provisions).',
    exemple: 'EBE (20M) + 75 (1M) - 65 (0.5M) - Dotations 681 (4.5M) = RE de 16 000 000 DA.',
    norme: 'Doit couvrir les charges financières et dégager du bénéfice net.'
  },
  {
    id: 'resultat_financier',
    category: 'sig',
    titre: '6. Résultat Financier',
    refSCF: 'Décret exécutif 08-156 • TCR Rubrique 6',
    formule: 'Résultat Financier = Produits Financiers (76 + 786) - Charges Financières (66 + 686)',
    comptes: 'Produits : 76 (Intérêts, dividendes reçus, gains de change) | Charges : 66 (Intérêts d\'emprunts, agios, pertes de change)',
    explication: 'Mesure l\'impact de la structure d\'endettement et des placements de trésorerie sur la rentabilité de l\'entreprise.',
    exemple: 'Produits financiers (0.2M) - Charges d\'intérêts (1.2M) = Résultat financier de -1 000 000 DA.',
    norme: 'Généralement négatif pour les entreprises endettées (poids des intérêts).'
  },
  {
    id: 'resultat_net',
    category: 'sig',
    titre: '7. Résultat Net de l\'Exercice',
    refSCF: 'Décret exécutif 08-156 • TCR Rubrique Finale',
    formule: 'Résultat Net = Résultat Ordinaire Avant Impôt (RCAI) - Impôts s/ Bénéfices (IBS 695 / 698) ± Impôts Différés (692/693) ± Résultat Extraordinaire (77 - 67)',
    comptes: 'RCAI = RE + R. Financier | Impôts : 695 (IBS 19% industrie / 26% services) | Extraordinaire : 77 - 67',
    explication: 'Bénéfice ou perte finale disponible pour l\'entreprise et ses associés (mise en réserve, report à nouveau ou dividendes).',
    exemple: 'RE (16M) - Financier (1M) = RCAI (15M) - IBS 19% (2.85M) = Résultat Net de +12 150 000 DA.',
    norme: 'Transféré au Bilan (Passif Compte 12) et au TVCP.'
  },

  // ══════════════════════════════════════════════════════
  // 4. CAPACITÉ D'AUTOFINANCEMENT (CAF)
  // ══════════════════════════════════════════════════════
  {
    id: 'caf_calcul',
    category: 'caf',
    titre: 'Capacité d\'Autofinancement (CAF)',
    refSCF: 'Méthodes Additive & Soustractive',
    formule: 'Méthode Additive : Résultat Net + Dotations Non Décaissées (68) - Reprises Non Encaissées (78) + VNC Éléments Cédés (652) - Produits de Cession (752)',
    comptes: 'Résultat Net (12) + Dotations Amort. (681/686) - Reprises (781/786) ± Plus/Moins-values de cession',
    explication: 'Flux potentiel de trésorerie interne généré par l\'activité courante de l\'entreprise permettant d\'autofinancer ses investissements, rembourser ses emprunts et payer des dividendes.',
    exemple: 'Résultat Net (12.15M) + Dotations Amort. (4.5M) = CAF de 16 650 000 DA.',
    norme: 'Ratio de Remboursement Dettes = Dettes Financières / CAF (doit être < 3 à 4 années).'
  },

  // ══════════════════════════════════════════════════════
  // 5. CAPITAUX PROPRES (TVCP)
  // ══════════════════════════════════════════════════════
  {
    id: 'tvcp_equation',
    category: 'tvcp',
    titre: 'Équation d\'Équilibre du TVCP (Capitaux Propres)',
    refSCF: 'Tableau des Variations des Capitaux Propres SCF',
    formule: 'CP Clôture (31 Déc.) = CP Ouverture (1er Janv. dont Résultat N-1) + Augmentations Capital - Dividendes Distribués N-1 + Résultat Net (N)',
    comptes: '101 (Capital), 106 (Réserves), 110 (Report à nouveau), 120 (Résultat N-1 soldé en N et Résultat N généré)',
    explication: 'Rapproche le patrimoine net entre le début et la fin de l\'exercice en traçant l\'affectation du résultat antérieur en AGO et l\'enrichissement net de l\'année.',
    exemple: 'Ouverture (21.5M) - Dividendes N-1 (2M) + Résultat Net N (+31.8M) = Clôture (51.3M DA).',
    norme: 'Équilibre matriciel strict ligne par ligne et colonne par colonne (0.00 DA d\'écart).'
  },

  // ══════════════════════════════════════════════════════
  // 6. STOCKS, ROTATION, POSSESSION & PORTAGE
  // ══════════════════════════════════════════════════════
  {
    id: 'stock_moyen_rotation',
    category: 'stocks',
    titre: 'Stock Moyen & Délai d\'Écoulement (Jours)',
    refSCF: 'Gestion des Stocks & BFR',
    formule: 'Stock Moyen = (Stock Initial + Stock Final) / 2 | Délai d\'Écoulement = (Stock Moyen / Achats Consommés 60) × 360 jours',
    comptes: 'Classe 3 (30, 31, 32, 33, 34, 35) vs Compte 60 (Achats consommés)',
    explication: 'Mesure le nombre moyen de jours pendant lesquels les stocks restent immobilisés en magasin avant d\'être consommés ou vendus.',
    exemple: 'Stock moyen = 15 000 000 DA, Achats consommés = 90 000 000 DA => Rotation = (15M / 90M) × 360 = 60 Jours.',
    norme: '≤15j : Risque rupture | 15-45j : Flux tendu optimal | 45-90j : Sécurisé | >90j : Sur-stockage.'
  },
  {
    id: 'taux_possession_portage',
    category: 'stocks',
    titre: 'Coût de Possession du Stock & Économie de Portage',
    refSCF: 'Contrôle de Gestion & Finance Logistique',
    formule: 'Coût Annuel = Stock Moyen × Taux Global (Tp) | Gain de Portage = |ΔStock déstocké| × Tp',
    comptes: 'Composantes Tp : Financier (5%) + Entreposage (3%) + Manutention (2%) + Assurance (1%) + Obsolescence (1%) = 12% standard',
    explication: 'Quantifie le coût réel d\'entreposage, de surveillance, d\'assurance et d\'immobilisation du capital, ainsi que l\'économie financière récurrente réalisée lors d\'un déstockage.',
    exemple: 'Stock moyen = 40M DA, Tp = 12% => Coût annuel = 4.8M DA. Si déstockage de 10M DA => Gain de portage = 1.2M DA / an.',
    norme: 'Taux standard industriel : 12% à 20% par an.'
  },
  {
    id: 'consommations_vs_production',
    category: 'stocks',
    titre: 'Consommations Globales (60 + Débit 72) vs Production (70x ± 72)',
    refSCF: 'SCF Décret 08-156 & Contrôle Anti-Surconsommation',
    formule: 'Consommations Totales = (601 + 602 ± 603) + Débit 72 | Production Totale = (700 à 703) + Crédit 72 - Débit 72',
    comptes: 'Approvisionnements : 601 (MP), 602 (Fournitures), 603 (Var. stock) | Produits : 70x (Ventes), 72 (Crédit = Prod. stockée / Débit = Déstockage PF)',
    explication: 'En analyse de gestion, le débit du compte 72 représente la consommation de stocks de produits finis antérieurs pour assurer les ventes, tandis que les comptes 60 représentent les matières consommées.',
    exemple: 'Consommations matières (14M) + Déstockage PF (2M) = 16 000 000 DA de stocks consommés pour un CA de 30 000 000 DA.',
    norme: 'Permet de vérifier le rendement matières et de déceler tout gaspillage ou coulage d\'atelier.'
  },

  // ══════════════════════════════════════════════════════
  // 7. RATIOS FINANCIERS & DÉLAIS
  // ══════════════════════════════════════════════════════
  {
    id: 'ratios_liquidite',
    category: 'ratios',
    titre: 'Ratios de Liquidité (Générale, Réduite, Immédiate)',
    refSCF: 'Ratios de Solvabilité Court Terme',
    formule: 'Liquidité Générale = Actif Circulant / Dettes CT | Liquidité Réduite = (Créances + Trésorerie) / Dettes CT | Immédiate = Trésorerie / Dettes CT',
    comptes: 'Actif Circulant (3+4+5) | Dettes CT = Passif Circulant (40, 42, 43, 44) + Trésorerie Passive (519)',
    explication: 'Mesure la capacité de l\'entreprise à rembourser ses dettes à court terme à l\'aide de ses actifs circulants et disponibilités.',
    exemple: 'Actif Circulant = 30M, Dettes CT = 20M => Ratio Liquidité Générale = 1.50.',
    norme: 'Liquidité générale > 1.20 : Bonne solvabilité CT | < 1.00 : Tension de liquidité.'
  },
  {
    id: 'ratios_rentabilite_roe_roa',
    category: 'ratios',
    titre: 'Rentabilité Financière (ROE) & Économique (ROA)',
    refSCF: 'Indicateurs de Performance Actionnariale',
    formule: 'ROE (Return on Equity) = Résultat Net / Capitaux Propres | ROA (Return on Assets) = Résultat Net / Total Bilan',
    comptes: 'Résultat Net (Compte 12) | Capitaux Propres (Classe 1) | Total Bilan (Actif)',
    explication: 'Le ROE mesure le rendement des capitaux investis par les associés/actionnaires. Le ROA mesure l\'efficacité globale de l\'actif.',
    exemple: 'Résultat Net = 12M DA, Capitaux Propres = 60M DA => ROE = 20.0%.',
    norme: 'ROE > 15% : Excellente rentabilité pour les investisseurs.'
  },
  {
    id: 'delais_clients_fournisseurs',
    category: 'ratios',
    titre: 'Délais Clients (DSO) & Délais Fournisseurs (DPO)',
    refSCF: 'Délais de Rotation du BFR',
    formule: 'Délai Clients = (Créances Clients 411 / CA TTC) × 360 j | Délai Fournisseurs = (Dettes Fournisseurs 401 / Achats TTC) × 360 j',
    comptes: 'Compte 411 (Clients) vs 70 (Chiffre d\'affaires) | Compte 401 (Fournisseurs) vs 60 (Achats)',
    explication: 'Mesure le temps moyen mis par les clients pour payer leurs factures et le délai moyen accordé par les fournisseurs.',
    exemple: 'Clients = 15M, CA TTC = 90M => DSO = 60 Jours. Fournisseurs = 12M, Achats TTC = 60M => DPO = 72 Jours.',
    norme: 'Règle d\'or du BFR : Délai Fournisseurs > Délai Clients.'
  },

  // ══════════════════════════════════════════════════════
  // 8. AUDIT BALANCE & RAPPROCHEMENTS SCF
  // ══════════════════════════════════════════════════════
  {
    id: 'audit_symetrie_amortissements',
    category: 'audit',
    titre: 'Symétrie Dotations (681) ↔ Amortissements (281)',
    refSCF: 'Contrôle Croisé d\'Audit SCF • Cycle Immobilisations',
    formule: 'Mouvement Débit Compte 681x (Dotation de l\'année) == Mouvement Crédit Compte 281x (Amortissement cumulé)',
    comptes: 'Charges : 681511, 681512, 681513, 681840 | Bilan : 281511, 281512, 281513, 281840',
    explication: 'Vérifie que chaque dotation d\'amortissement comptabilisée en charge au TCR correspond au centime près à l\'augmentation de l\'amortissement au Bilan.',
    exemple: 'Débit 681511 = 1 600 000 DA <=> Crédit 281511 = 1 600 000 DA (Écart = 0 DA => ✓ Conforme).',
    norme: 'Tolérance d\'écart = 0.00 DA.'
  },
  {
    id: 'audit_liaison_181',
    category: 'audit',
    titre: 'Soldage des Comptes de Liaison (181 / 58)',
    refSCF: 'Contrôle de Clôture SCF • Cycle Établissements & Virements',
    formule: 'Solde Fin Débit (181) == Solde Fin Crédit (181) == 0.00 DA (Mouvements Débit == Mouvements Crédit)',
    comptes: '181000 (Comptes de liaison inter-établissements), 580000 (Virements internes)',
    explication: 'Les comptes de virements de fonds et de liaison doivent impérativement être soldés à zéro à la clôture de l\'exercice.',
    exemple: 'Mouvement Débit 181 = 85 955 423 DA, Mouvement Crédit 181 = 85 955 423 DA => Solde Fin = 0 DA (✓ Conforme).',
    norme: 'Tout solde non nul sur le compte 181 ou 58 en fin d\'exercice constitue une anomalie bloquante.'
  }
];

export function CalculationsIndexView() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const categories = [
    { id: 'all',       label: 'Toutes les sections', icon: 'apps',               color: 'var(--primary)' },
    { id: 'bilan',     label: 'Bilan & Équilibre',   icon: 'account_tree',       color: '#2563eb' },
    { id: 'bfr',       label: 'FRNG, BFR & Trésorerie', icon: 'payments',        color: '#059669' },
    { id: 'sig',       label: 'SIG & TCR par Nature', icon: 'analytics',         color: '#7c3aed' },
    { id: 'caf',       label: 'CAF & Autofinancement', icon: 'savings',          color: '#0891b2' },
    { id: 'tvcp',      label: 'Capitaux Propres (TVCP)', icon: 'account_balance_wallet', color: '#d97706' },
    { id: 'stocks',    label: 'Stocks, Possession & Portage', icon: 'warehouse', color: '#dc2626' },
    { id: 'ratios',    label: 'Ratios & Délais',      icon: 'query_stats',       color: '#4f46e5' },
    { id: 'audit',     label: 'Audit Balance & Flux', icon: 'fact_check',        color: '#0284c7' }
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
        item.refSCF.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="fade-in space-y-6">
      
      {/* ── BANDEAU EN-TÊTE : INDEX DES CALCULS ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,189,248,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#38bdf8' }}>menu_book</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                Index &amp; Dictionnaire des Règles de Calculs
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Méthodologie formelle SCF (Loi 07-11 / Décret 08-156) • Formules, Définitions &amp; Comptes Associés
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '5px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>verified</span>
              {FORMULAS_DATABASE.length} Règles Normalisées
            </span>
          </div>
        </div>

        {/* Barre de Recherche Rapide */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 650 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: '#94a3b8' }}>search</span>
          <input
            type="text"
            placeholder="Rechercher une formule, un compte (ex: EBE, FRNG, 603, 72, ROE, possession)..."
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
                fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
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
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>search_off</span>
            <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Aucune formule ne correspond à votre recherche</h4>
            <p style={{ fontSize: '0.78rem' }}>Essayez un autre mot-clé ou sélectionnez « Toutes les sections ».</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', textTransform: 'uppercase' }}>
                        {item.refSCF}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: 'var(--text)' }}>
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
                  <div className="fade-in space-y-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: '0.76rem', color: 'var(--text)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-sub)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>Comptes SCF Associés :</strong>
                      <div style={{ color: '#1e40af', fontWeight: 700, marginTop: 2, background: '#eff6ff', padding: '4px 8px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                        {item.comptes}
                      </div>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--text-sub)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>Signification &amp; Objectif Financier :</strong>
                      <p style={{ margin: '3px 0 0', color: 'var(--text)', lineHeight: 1.45 }}>
                        {item.explication}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 6 }}>
                      <div style={{ padding: '8px 10px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>💡 Exemple Chiffré :</span>
                        <div style={{ fontSize: '0.72rem', color: '#1e293b', marginTop: 2, fontWeight: 600 }}>{item.exemple}</div>
                      </div>

                      <div style={{ padding: '8px 10px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>🎯 Règle Normative :</span>
                        <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: 2, fontWeight: 700 }}>{item.norme}</div>
                      </div>
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
