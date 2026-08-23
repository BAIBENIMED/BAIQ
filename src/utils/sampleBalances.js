/**
 * ═══════════════════════════════════════════════════════════════
 * EXEMPLES DE BALANCES COMPTABLES SCF (Algérie — Loi 07-11)
 * Jeux de données réels et équilibrés pour tester la plateforme :
 * 1. Commerce & Distribution (SARL Distribution)
 * 2. Industrie & Production (SPA Manufacture)
 * 3. BTP & Travaux Publics (EURL Construction)
 * 4. Cas Spécial Audit & Rapprochements SCF
 * ═══════════════════════════════════════════════════════════════
 */

import * as XLSX from 'xlsx';

export const SAMPLE_BALANCES = [
  {
    id: 'commerce_distribution',
    title: 'SOCIÉTÉ COMMERCE & DISTRIBUTION SARL',
    subtitle: 'Négoce, Gros & Demi-Gros — Exercice N & N-1',
    secteurId: 'commerce_gros',
    effectif: 28,
    caN: '142 500 000 DA',
    description: 'Entreprise commerciale typique avec stocks de marchandises, créances clients, fournisseurs, TVA, IBS et amortissements réguliers.',
    badge: 'Commerce / Distribution',
    badgeColor: '#3b82f6',
    rowsN: [
      // CLASSE 1 : CAPITAUX
      { compte: '101000', libelle: 'Capital social émis', soldeDebutDebit: 0, soldeDebutCredit: 25000000, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 25000000 },
      { compte: '106100', libelle: 'Réserve légale', soldeDebutDebit: 0, soldeDebutCredit: 2500000, mouvementDebit: 0, mouvementCredit: 350000, soldeFinDebit: 0, soldeFinCredit: 2850000 },
      { compte: '106800', libelle: 'Autres réserves statutaires', soldeDebutDebit: 0, soldeDebutCredit: 4200000, mouvementDebit: 0, mouvementCredit: 1200000, soldeFinDebit: 0, soldeFinCredit: 5400000 },
      { compte: '110000', libelle: 'Report à nouveau créditeur', soldeDebutDebit: 0, soldeDebutCredit: 3150000, mouvementDebit: 1500000, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 1650000 },
      { compte: '120000', libelle: 'Résultat net de l\'exercice (Bénéfice)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 8425000, soldeFinDebit: 0, soldeFinCredit: 8425000 },
      { compte: '164000', libelle: 'Emprunts auprès des établissements de crédit', soldeDebutDebit: 0, soldeDebutCredit: 12000000, mouvementDebit: 3000000, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 9000000 },

      // CLASSE 2 : IMMOBILISATIONS
      { compte: '213000', libelle: 'Constructions & Entrepôts', soldeDebutDebit: 22000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 22000000, soldeFinCredit: 0 },
      { compte: '215400', libelle: 'Matériel de manutention & chariots', soldeDebutDebit: 6500000, soldeDebutCredit: 0, mouvementDebit: 1800000, mouvementCredit: 0, soldeFinDebit: 8300000, soldeFinCredit: 0 },
      { compte: '218200', libelle: 'Matériel de transport (Camions & Utilitaires)', soldeDebutDebit: 14000000, soldeDebutCredit: 0, mouvementDebit: 3500000, mouvementCredit: 0, soldeFinDebit: 17500000, soldeFinCredit: 0 },
      { compte: '218300', libelle: 'Matériel informatique et bureautique', soldeDebutDebit: 3200000, soldeDebutCredit: 0, mouvementDebit: 850000, mouvementCredit: 0, soldeFinDebit: 4050000, soldeFinCredit: 0 },
      { compte: '218400', libelle: 'Mobilier de bureau & agencement', soldeDebutDebit: 2100000, soldeDebutCredit: 0, mouvementDebit: 400000, mouvementCredit: 0, soldeFinDebit: 2500000, soldeFinCredit: 0 },

      // AMORTISSEMENTS CLASSE 28
      { compte: '281300', libelle: 'Amortissement des constructions', soldeDebutDebit: 0, soldeDebutCredit: 4400000, mouvementDebit: 0, mouvementCredit: 1100000, soldeFinDebit: 0, soldeFinCredit: 5500000 },
      { compte: '281540', libelle: 'Amortissement matériel de manutention', soldeDebutDebit: 0, soldeDebutCredit: 2600000, mouvementDebit: 0, mouvementCredit: 1245000, soldeFinDebit: 0, soldeFinCredit: 3845000 },
      { compte: '281820', libelle: 'Amortissement matériel de transport', soldeDebutDebit: 0, soldeDebutCredit: 5600000, mouvementDebit: 0, mouvementCredit: 3500000, soldeFinDebit: 0, soldeFinCredit: 9100000 },
      { compte: '281830', libelle: 'Amortissement matériel informatique', soldeDebutDebit: 0, soldeDebutCredit: 1600000, mouvementDebit: 0, mouvementCredit: 1012500, soldeFinDebit: 0, soldeFinCredit: 2612500 },
      { compte: '281840', libelle: 'Amortissement mobilier de bureau', soldeDebutDebit: 0, soldeDebutCredit: 840000, mouvementDebit: 0, mouvementCredit: 250000, soldeFinDebit: 0, soldeFinCredit: 1090000 },

      // CLASSE 3 : STOCKS
      { compte: '300000', libelle: 'Stocks de marchandises - Marché local', soldeDebutDebit: 18500000, soldeDebutCredit: 0, mouvementDebit: 88500000, mouvementCredit: 85200000, soldeFinDebit: 21800000, soldeFinCredit: 0 },
      { compte: '380000', libelle: 'Achats de marchandises stockées', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 88500000, mouvementCredit: 88500000, soldeFinDebit: 0, soldeFinCredit: 0 },
      { compte: '390000', libelle: 'Pertes de valeur sur stocks de marchandises', soldeDebutDebit: 0, soldeDebutCredit: 450000, mouvementDebit: 0, mouvementCredit: 150000, soldeFinDebit: 0, soldeFinCredit: 600000 },

      // CLASSE 4 : TIERS
      { compte: '401100', libelle: 'Fournisseurs d\'exploitation locaux', soldeDebutDebit: 0, soldeDebutCredit: 14200000, mouvementDebit: 78500000, mouvementCredit: 81200000, soldeFinDebit: 0, soldeFinCredit: 16900000 },
      { compte: '409100', libelle: 'Fournisseurs - Avances et acomptes versés', soldeDebutDebit: 650000, soldeDebutCredit: 0, mouvementDebit: 1200000, mouvementCredit: 1050000, soldeFinDebit: 800000, soldeFinCredit: 0 },
      { compte: '411100', libelle: 'Clients ordinaires - Créances courantes', soldeDebutDebit: 24500000, soldeDebutCredit: 0, mouvementDebit: 169575000, mouvementCredit: 162275000, soldeFinDebit: 31800000, soldeFinCredit: 0 },
      { compte: '419100', libelle: 'Clients - Avances et acomptes reçus', soldeDebutDebit: 0, soldeDebutCredit: 1200000, mouvementDebit: 1200000, mouvementCredit: 950000, soldeFinDebit: 0, soldeFinCredit: 950000 },
      { compte: '421000', libelle: 'Personnel - Rémunérations dues', soldeDebutDebit: 0, soldeDebutCredit: 1850000, mouvementDebit: 18250000, mouvementCredit: 18500000, soldeFinDebit: 0, soldeFinCredit: 2100000 },
      { compte: '431000', libelle: 'Sécurité Sociale (CNAS)', soldeDebutDebit: 0, soldeDebutCredit: 820000, mouvementDebit: 7425000, mouvementCredit: 7525000, soldeFinDebit: 0, soldeFinCredit: 920000 },
      { compte: '444000', libelle: 'État - Impôts sur les bénéfices (IBS)', soldeDebutDebit: 0, soldeDebutCredit: 1950000, mouvementDebit: 1950000, mouvementCredit: 2808333, soldeFinDebit: 0, soldeFinCredit: 2808333 },
      { compte: '445600', libelle: 'TVA déductible sur achats et services', soldeDebutDebit: 1450000, soldeDebutCredit: 0, mouvementDebit: 18520000, mouvementCredit: 18250000, soldeFinDebit: 1720000, soldeFinCredit: 0 },
      { compte: '445700', libelle: 'TVA collectée sur ventes', soldeDebutDebit: 0, soldeDebutCredit: 2350000, mouvementDebit: 27075000, mouvementCredit: 27075000, soldeFinDebit: 0, soldeFinCredit: 2350000 },

      // CLASSE 5 : TRÉSORERIE
      { compte: '512100', libelle: 'Banque Nationale d\'Algérie (BNA)', soldeDebutDebit: 8450000, soldeDebutCredit: 0, mouvementDebit: 148500000, mouvementCredit: 145200000, soldeFinDebit: 11750000, soldeFinCredit: 0 },
      { compte: '512200', libelle: 'Banque Extérieure d\'Algérie (BEA)', soldeDebutDebit: 4200000, soldeDebutCredit: 0, mouvementDebit: 42100000, mouvementCredit: 41800000, soldeFinDebit: 4500000, soldeFinCredit: 0 },
      { compte: '530000', libelle: 'Caisse centrale', soldeDebutDebit: 320000, soldeDebutCredit: 0, mouvementDebit: 4850000, mouvementCredit: 4620000, soldeFinDebit: 550000, soldeFinCredit: 0 },
      { compte: '580000', libelle: 'Virements internes', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 12500000, mouvementCredit: 12500000, soldeFinDebit: 0, soldeFinCredit: 0 },

      // CLASSE 6 : CHARGES
      { compte: '600000', libelle: 'Achats de marchandises vendues', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 85200000, mouvementCredit: 0, soldeFinDebit: 85200000, soldeFinCredit: 0 },
      { compte: '613000', libelle: 'Locations immobilières & entrepôts', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 3600000, mouvementCredit: 0, soldeFinDebit: 3600000, soldeFinCredit: 0 },
      { compte: '615000', libelle: 'Entretien et réparations matériel', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1450000, mouvementCredit: 0, soldeFinDebit: 1450000, soldeFinCredit: 0 },
      { compte: '616000', libelle: 'Primes d\'assurance', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 980000, mouvementCredit: 0, soldeFinDebit: 980000, soldeFinCredit: 0 },
      { compte: '622000', libelle: 'Rémunérations d\'intermédiaires et honoraires', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1250000, mouvementCredit: 0, soldeFinDebit: 1250000, soldeFinCredit: 0 },
      { compte: '624000', libelle: 'Transports de biens et livraisons clients', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2850000, mouvementCredit: 0, soldeFinDebit: 2850000, soldeFinCredit: 0 },
      { compte: '626000', libelle: 'Frais postaux et télécommunications', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 420000, mouvementCredit: 0, soldeFinDebit: 420000, soldeFinCredit: 0 },
      { compte: '627000', libelle: 'Services bancaires et commissions', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 380000, mouvementCredit: 0, soldeFinDebit: 380000, soldeFinCredit: 0 },
      { compte: '631000', libelle: 'Rémunérations du personnel (Salaires bruts)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 18500000, mouvementCredit: 0, soldeFinDebit: 18500000, soldeFinCredit: 0 },
      { compte: '635000', libelle: 'Cotisations sociales patronales (CNAS 26%)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 4810000, mouvementCredit: 0, soldeFinDebit: 4810000, soldeFinCredit: 0 },
      { compte: '640000', libelle: 'Impôts, taxes et versements assimilés (TAP)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2137500, mouvementCredit: 0, soldeFinDebit: 2137500, soldeFinCredit: 0 },
      { compte: '661000', libelle: 'Charges d\'intérêts sur emprunts bancaires', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 720000, mouvementCredit: 0, soldeFinDebit: 720000, soldeFinCredit: 0 },
      { compte: '681120', libelle: 'Dotations aux amortissements des constructions', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1100000, mouvementCredit: 0, soldeFinDebit: 1100000, soldeFinCredit: 0 },
      { compte: '681154', libelle: 'Dotations amort. matériel de manutention', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1245000, mouvementCredit: 0, soldeFinDebit: 1245000, soldeFinCredit: 0 },
      { compte: '681182', libelle: 'Dotations amort. matériel de transport', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 3500000, mouvementCredit: 0, soldeFinDebit: 3500000, soldeFinCredit: 0 },
      { compte: '681183', libelle: 'Dotations amort. matériel informatique', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1012500, mouvementCredit: 0, soldeFinDebit: 1012500, soldeFinCredit: 0 },
      { compte: '681184', libelle: 'Dotations amort. mobilier de bureau', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 250000, mouvementCredit: 0, soldeFinDebit: 250000, soldeFinCredit: 0 },
      { compte: '685000', libelle: 'Dotations aux pertes de valeur sur stocks', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 150000, mouvementCredit: 0, soldeFinDebit: 150000, soldeFinCredit: 0 },
      { compte: '695000', libelle: 'Impôts sur les bénéfices des sociétés (IBS 26%)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2808333, mouvementCredit: 0, soldeFinDebit: 2808333, soldeFinCredit: 0 },

      // CLASSE 7 : PRODUITS
      { compte: '700000', libelle: 'Ventes de marchandises - Réseau national', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 142500000, soldeFinDebit: 0, soldeFinCredit: 142500000 },
      { compte: '758000', libelle: 'Produits divers de gestion courante', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 450000, soldeFinDebit: 0, soldeFinCredit: 450000 },
      { compte: '768000', libelle: 'Autres produits financiers & escomptes', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 185000, soldeFinDebit: 0, soldeFinCredit: 185000 },
    ],
    rowsN1: [
      { compte: '101000', libelle: 'Capital social émis', soldeDebutDebit: 0, soldeDebutCredit: 25000000, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 25000000 },
      { compte: '106100', libelle: 'Réserve légale', soldeDebutDebit: 0, soldeDebutCredit: 2150000, mouvementDebit: 0, mouvementCredit: 350000, soldeFinDebit: 0, soldeFinCredit: 2500000 },
      { compte: '106800', libelle: 'Autres réserves statutaires', soldeDebutDebit: 0, soldeDebutCredit: 3200000, mouvementDebit: 0, mouvementCredit: 1000000, soldeFinDebit: 0, soldeFinCredit: 4200000 },
      { compte: '110000', libelle: 'Report à nouveau créditeur', soldeDebutDebit: 0, soldeDebutCredit: 2800000, mouvementDebit: 0, mouvementCredit: 350000, soldeFinDebit: 0, soldeFinCredit: 3150000 },
      { compte: '120000', libelle: 'Résultat net N-1', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 6850000, soldeFinDebit: 0, soldeFinCredit: 6850000 },
      { compte: '164000', libelle: 'Emprunts bancaires LT', soldeDebutDebit: 0, soldeDebutCredit: 15000000, mouvementDebit: 3000000, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 12000000 },
      { compte: '213000', libelle: 'Constructions', soldeDebutDebit: 22000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 22000000, soldeFinCredit: 0 },
      { compte: '218200', libelle: 'Matériel de transport', soldeDebutDebit: 14000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 14000000, soldeFinCredit: 0 },
      { compte: '281300', libelle: 'Amortissement constructions', soldeDebutDebit: 0, soldeDebutCredit: 3300000, mouvementDebit: 0, mouvementCredit: 1100000, soldeFinDebit: 0, soldeFinCredit: 4400000 },
      { compte: '281820', libelle: 'Amortissement matériel transport', soldeDebutDebit: 0, soldeDebutCredit: 2800000, mouvementDebit: 0, mouvementCredit: 2800000, soldeFinDebit: 0, soldeFinCredit: 5600000 },
      { compte: '300000', libelle: 'Stocks marchandises', soldeDebutDebit: 15200000, soldeDebutCredit: 0, mouvementDebit: 74200000, mouvementCredit: 70900000, soldeFinDebit: 18500000, soldeFinCredit: 0 },
      { compte: '401100', libelle: 'Fournisseurs d\'exploitation', soldeDebutDebit: 0, soldeDebutCredit: 11800000, mouvementDebit: 68500000, mouvementCredit: 70900000, soldeFinDebit: 0, soldeFinCredit: 14200000 },
      { compte: '411100', libelle: 'Clients ordinaires', soldeDebutDebit: 19800000, soldeDebutCredit: 0, mouvementDebit: 143990000, mouvementCredit: 139290000, soldeFinDebit: 24500000, soldeFinCredit: 0 },
      { compte: '512100', libelle: 'Banque BNA', soldeDebutDebit: 5200000, soldeDebutCredit: 0, mouvementDebit: 124500000, mouvementCredit: 121250000, soldeFinDebit: 8450000, soldeFinCredit: 0 },
      { compte: '600000', libelle: 'Achats de marchandises', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 70900000, mouvementCredit: 0, soldeFinDebit: 70900000, soldeFinCredit: 0 },
      { compte: '631000', libelle: 'Rémunérations personnel', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 15400000, mouvementCredit: 0, soldeFinDebit: 15400000, soldeFinCredit: 0 },
      { compte: '700000', libelle: 'Ventes de marchandises', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 121000000, soldeFinDebit: 0, soldeFinCredit: 121000000 },
    ]
  },

  {
    id: 'industrie_production',
    title: 'MANUFACTURE INDUSTRIELLE ALGÉRIE SPA',
    subtitle: 'Production & Transformation — Exercice N & N-1',
    secteurId: 'industrie_agro',
    effectif: 85,
    caN: '320 000 000 DA',
    description: 'Entreprise industrielle avec stocks de matières premières, produits finis, production stockée (72), amortissements d\'usines et ratios de production.',
    badge: 'Industrie / Production',
    badgeColor: '#10b981',
    rowsN: [
      { compte: '101000', libelle: 'Capital social émis', soldeDebutDebit: 0, soldeDebutCredit: 60000000, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 60000000 },
      { compte: '106100', libelle: 'Réserve légale', soldeDebutDebit: 0, soldeDebutCredit: 6000000, mouvementDebit: 0, mouvementCredit: 800000, soldeFinDebit: 0, soldeFinCredit: 6800000 },
      { compte: '106800', libelle: 'Autres réserves', soldeDebutDebit: 0, soldeDebutCredit: 18500000, mouvementDebit: 0, mouvementCredit: 3200000, soldeFinDebit: 0, soldeFinCredit: 21700000 },
      { compte: '110000', libelle: 'Report à nouveau créditeur', soldeDebutDebit: 0, soldeDebutCredit: 5400000, mouvementDebit: 0, mouvementCredit: 1800000, soldeFinDebit: 0, soldeFinCredit: 7200000 },
      { compte: '120000', libelle: 'Résultat net de l\'exercice (Bénéfice)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 24650000, soldeFinDebit: 0, soldeFinCredit: 24650000 },
      { compte: '164000', libelle: 'Emprunts bancaires d\'investissement', soldeDebutDebit: 0, soldeDebutCredit: 45000000, mouvementDebit: 9000000, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 36000000 },

      // IMMOS
      { compte: '211000', libelle: 'Terrains industriels', soldeDebutDebit: 18000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 18000000, soldeFinCredit: 0 },
      { compte: '213100', libelle: 'Bâtiments industriels & Usine', soldeDebutDebit: 48000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 48000000, soldeFinCredit: 0 },
      { compte: '215100', libelle: 'Installations complexes spécialisées (Ligne de production)', soldeDebutDebit: 65000000, soldeDebutCredit: 0, mouvementDebit: 12000000, mouvementCredit: 0, soldeFinDebit: 77000000, soldeFinCredit: 0 },
      { compte: '215400', libelle: 'Matériel industriel & Outillage', soldeDebutDebit: 14500000, soldeDebutCredit: 0, mouvementDebit: 2500000, mouvementCredit: 0, soldeFinDebit: 17000000, soldeFinCredit: 0 },
      { compte: '218200', libelle: 'Matériel de transport logistique', soldeDebutDebit: 18500000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 18500000, soldeFinCredit: 0 },

      // AMORTISSEMENTS
      { compte: '281310', libelle: 'Amortissement des bâtiments industriels', soldeDebutDebit: 0, soldeDebutCredit: 9600000, mouvementDebit: 0, mouvementCredit: 2400000, soldeFinDebit: 0, soldeFinCredit: 12000000 },
      { compte: '281510', libelle: 'Amortissement installations de production', soldeDebutDebit: 0, soldeDebutCredit: 26000000, mouvementDebit: 0, mouvementCredit: 7700000, soldeFinDebit: 0, soldeFinCredit: 33700000 },
      { compte: '281540', libelle: 'Amortissement matériel industriel', soldeDebutDebit: 0, soldeDebutCredit: 5800000, mouvementDebit: 0, mouvementCredit: 1700000, soldeFinDebit: 0, soldeFinCredit: 7500000 },
      { compte: '281820', libelle: 'Amortissement matériel de transport', soldeDebutDebit: 0, soldeDebutCredit: 7400000, mouvementDebit: 0, mouvementCredit: 3700000, soldeFinDebit: 0, soldeFinCredit: 11100000 },

      // STOCKS INDUSTRIE
      { compte: '310000', libelle: 'Stocks de matières premières & fournitures', soldeDebutDebit: 28500000, soldeDebutCredit: 0, mouvementDebit: 145000000, mouvementCredit: 141500000, soldeFinDebit: 32000000, soldeFinCredit: 0 },
      { compte: '381000', libelle: 'Achats de matières premières stockées', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 145000000, mouvementCredit: 145000000, soldeFinDebit: 0, soldeFinCredit: 0 },
      { compte: '355000', libelle: 'Stocks de produits finis', soldeDebutDebit: 22000000, soldeDebutCredit: 0, mouvementDebit: 245000000, mouvementCredit: 238000000, soldeFinDebit: 29000000, soldeFinCredit: 0 },

      // TIERS
      { compte: '401100', libelle: 'Fournisseurs de matières & sous-traitance', soldeDebutDebit: 0, soldeDebutCredit: 24500000, mouvementDebit: 155000000, mouvementCredit: 161500000, soldeFinDebit: 0, soldeFinCredit: 31000000 },
      { compte: '411100', libelle: 'Clients industriels & distributeurs', soldeDebutDebit: 42000000, soldeDebutCredit: 0, mouvementDebit: 380800000, mouvementCredit: 367800000, soldeFinDebit: 55000000, soldeFinCredit: 0 },
      { compte: '421000', libelle: 'Personnel - Salaires dus', soldeDebutDebit: 0, soldeDebutCredit: 4500000, mouvementDebit: 52000000, mouvementCredit: 52500000, soldeFinDebit: 0, soldeFinCredit: 5000000 },
      { compte: '431000', libelle: 'Sécurité Sociale (CNAS)', soldeDebutDebit: 0, soldeDebutCredit: 2100000, mouvementDebit: 21000000, mouvementCredit: 21300000, soldeFinDebit: 0, soldeFinCredit: 2400000 },
      { compte: '444000', libelle: 'État - IBS', soldeDebutDebit: 0, soldeDebutCredit: 4800000, mouvementDebit: 4800000, mouvementCredit: 8216667, soldeFinDebit: 0, soldeFinCredit: 8216667 },
      { compte: '445600', libelle: 'TVA déductible', soldeDebutDebit: 3200000, soldeDebutCredit: 0, mouvementDebit: 32500000, mouvementCredit: 32100000, soldeFinDebit: 3600000, soldeFinCredit: 0 },
      { compte: '445700', libelle: 'TVA collectée', soldeDebutDebit: 0, soldeDebutCredit: 5400000, mouvementDebit: 60800000, mouvementCredit: 60800000, soldeFinDebit: 0, soldeFinCredit: 5400000 },

      // TRÉSORERIE
      { compte: '512100', libelle: 'Banque BNA', soldeDebutDebit: 18500000, soldeDebutCredit: 0, mouvementDebit: 345000000, mouvementCredit: 338500000, soldeFinDebit: 25000000, soldeFinCredit: 0 },
      { compte: '512200', libelle: 'Banque CPA', soldeDebutDebit: 6200000, soldeDebutCredit: 0, mouvementDebit: 85000000, mouvementCredit: 83200000, soldeFinDebit: 8000000, soldeFinCredit: 0 },
      { compte: '530000', libelle: 'Caisse usine', soldeDebutDebit: 450000, soldeDebutCredit: 0, mouvementDebit: 6500000, mouvementCredit: 6200000, soldeFinDebit: 750000, soldeFinCredit: 0 },

      // CHARGES
      { compte: '601000', libelle: 'Matières premières consommées', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 141500000, mouvementCredit: 0, soldeFinDebit: 141500000, soldeFinCredit: 0 },
      { compte: '604000', libelle: 'Achats d\'études et prestations de services', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 8500000, mouvementCredit: 0, soldeFinDebit: 8500000, soldeFinCredit: 0 },
      { compte: '605000', libelle: 'Achats de matériel, équipements & énergie (Gaz/Élec)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 16200000, mouvementCredit: 0, soldeFinDebit: 16200000, soldeFinCredit: 0 },
      { compte: '615000', libelle: 'Entretien et réparations industrielles', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 4800000, mouvementCredit: 0, soldeFinDebit: 4800000, soldeFinCredit: 0 },
      { compte: '616000', libelle: 'Assurances usines et responsabilités', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2400000, mouvementCredit: 0, soldeFinDebit: 2400000, soldeFinCredit: 0 },
      { compte: '624000', libelle: 'Transports industriels & expéditions', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 7200000, mouvementCredit: 0, soldeFinDebit: 7200000, soldeFinCredit: 0 },
      { compte: '631000', libelle: 'Salaires bruts du personnel', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 52500000, mouvementCredit: 0, soldeFinDebit: 52500000, soldeFinCredit: 0 },
      { compte: '635000', libelle: 'Cotisations CNAS (26%)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 13650000, mouvementCredit: 0, soldeFinDebit: 13650000, soldeFinCredit: 0 },
      { compte: '640000', libelle: 'Taxes professionnelles (TAP)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 4800000, mouvementCredit: 0, soldeFinDebit: 4800000, soldeFinCredit: 0 },
      { compte: '661000', libelle: 'Intérêts sur emprunts d\'investissement', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2880000, mouvementCredit: 0, soldeFinDebit: 2880000, soldeFinCredit: 0 },
      { compte: '681130', libelle: 'Dotations amort. bâtiments usine', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2400000, mouvementCredit: 0, soldeFinDebit: 2400000, soldeFinCredit: 0 },
      { compte: '681151', libelle: 'Dotations amort. lignes de production', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 7700000, mouvementCredit: 0, soldeFinDebit: 7700000, soldeFinCredit: 0 },
      { compte: '681154', libelle: 'Dotations amort. matériel industriel', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1700000, mouvementCredit: 0, soldeFinDebit: 1700000, soldeFinCredit: 0 },
      { compte: '681182', libelle: 'Dotations amort. matériel de transport', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 3700000, mouvementCredit: 0, soldeFinDebit: 3700000, soldeFinCredit: 0 },
      { compte: '695000', libelle: 'Impôts sur bénéfices industriels (IBS 25%)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 8216667, mouvementCredit: 0, soldeFinDebit: 8216667, soldeFinCredit: 0 },

      // PRODUITS
      { compte: '701000', libelle: 'Ventes de produits finis', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 320000000, soldeFinDebit: 0, soldeFinCredit: 320000000 },
      { compte: '720000', libelle: 'Production stockée (Variation stocks produits)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 7000000, soldeFinDebit: 0, soldeFinCredit: 7000000 },
      { compte: '758000', libelle: 'Produits divers d\'exploitation', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 850000, soldeFinDebit: 0, soldeFinCredit: 850000 },
    ]
  },

  {
    id: 'special_audit_scf',
    title: 'DOSSIER SPÉCIAL TEST AUDIT & RAPPROCHEMENTS SCF',
    subtitle: 'Balance de test d\'audit (Jointures parfaites + anomalies de contrôle)',
    secteurId: 'services_entreprises',
    effectif: 40,
    caN: '88 000 000 DA',
    description: 'Spécifiquement conçu pour tester le module d\'Audit SCF : contient des symétries de comptes parfaites (681513 ↔ 281513, 681511 ↔ 281511, 381 ↔ 31), des comptes soldés (181, 580) et des écarts maîtrisés.',
    badge: 'Spécial Audit SCF',
    badgeColor: '#8b5cf6',
    rowsN: [
      // Capitaux
      { compte: '101000', libelle: 'Capital social', soldeDebutDebit: 0, soldeDebutCredit: 15000000, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 15000000 },
      { compte: '106100', libelle: 'Réserve légale', soldeDebutDebit: 0, soldeDebutCredit: 1500000, mouvementDebit: 0, mouvementCredit: 250000, soldeFinDebit: 0, soldeFinCredit: 1750000 },
      { compte: '181000', libelle: 'Comptes de liaison entre établissements', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 85955423, mouvementCredit: 85955423, soldeFinDebit: 0, soldeFinCredit: 0 },
      { compte: '120000', libelle: 'Résultat de l\'exercice', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 6420000, soldeFinDebit: 0, soldeFinCredit: 6420000 },

      // Immos
      { compte: '215110', libelle: 'Matériel de transport lourd', soldeDebutDebit: 8000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 8000000, soldeFinCredit: 0 },
      { compte: '215130', libelle: 'Équipements informatiques et serveurs', soldeDebutDebit: 5500000, soldeDebutCredit: 0, mouvementDebit: 1200000, mouvementCredit: 0, soldeFinDebit: 6700000, soldeFinCredit: 0 },
      { compte: '218400', libelle: 'Mobilier de bureau', soldeDebutDebit: 2000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 2000000, soldeFinCredit: 0 },

      // Amortissements symétriques
      { compte: '281511', libelle: 'Amortissement matériel de transport lourd', soldeDebutDebit: 0, soldeDebutCredit: 3200000, mouvementDebit: 0, mouvementCredit: 1600000, soldeFinDebit: 0, soldeFinCredit: 4800000 },
      { compte: '281513', libelle: 'Amortissement équipements informatiques', soldeDebutDebit: 0, soldeDebutCredit: 2200000, mouvementDebit: 0, mouvementCredit: 1340000, soldeFinDebit: 0, soldeFinCredit: 3540000 },
      { compte: '281840', libelle: 'Amortissement mobilier de bureau', soldeDebutDebit: 0, soldeDebutCredit: 800000, mouvementDebit: 0, mouvementCredit: 200000, soldeFinDebit: 0, soldeFinCredit: 1000000 },

      // Stocks & achats
      { compte: '310001', libelle: 'Fournitures consommables A', soldeDebutDebit: 1200000, soldeDebutCredit: 0, mouvementDebit: 14500000, mouvementCredit: 14200000, soldeFinDebit: 1500000, soldeFinCredit: 0 },
      { compte: '381001', libelle: 'Achats fournitures stockées A', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 14500000, mouvementCredit: 14500000, soldeFinDebit: 0, soldeFinCredit: 0 },

      // Tiers & Trésorerie
      { compte: '401100', libelle: 'Fournisseurs d\'exploitation', soldeDebutDebit: 0, soldeDebutCredit: 6200000, mouvementDebit: 32500000, mouvementCredit: 34100000, soldeFinDebit: 0, soldeFinCredit: 7800000 },
      { compte: '411100', libelle: 'Clients prestations', soldeDebutDebit: 12400000, soldeDebutCredit: 0, mouvementDebit: 104720000, mouvementCredit: 101120000, soldeFinDebit: 16000000, soldeFinCredit: 0 },
      { compte: '512100', libelle: 'Banque BNA', soldeDebutDebit: 4800000, soldeDebutCredit: 0, mouvementDebit: 88500000, mouvementCredit: 85300000, soldeFinDebit: 8000000, soldeFinCredit: 0 },
      { compte: '580000', libelle: 'Virements internes', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 9500000, mouvementCredit: 9500000, soldeFinDebit: 0, soldeFinCredit: 0 },

      // Charges
      { compte: '601001', libelle: 'Consommations fournitures A', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 14200000, mouvementCredit: 0, soldeFinDebit: 14200000, soldeFinCredit: 0 },
      { compte: '631000', libelle: 'Salaires du personnel', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 32000000, mouvementCredit: 0, soldeFinDebit: 32000000, soldeFinCredit: 0 },
      { compte: '681511', libelle: 'Dotations amort. matériel transport lourd', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1600000, mouvementCredit: 0, soldeFinDebit: 1600000, soldeFinCredit: 0 },
      { compte: '681513', libelle: 'Dotations amort. équipements informatiques', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1340000, mouvementCredit: 0, soldeFinDebit: 1340000, soldeFinCredit: 0 },
      { compte: '681840', libelle: 'Dotations amort. mobilier de bureau', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 200000, mouvementCredit: 0, soldeFinDebit: 200000, soldeFinCredit: 0 },
      { compte: '695000', libelle: 'IBS (Impôt sur les bénéfices)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2140000, mouvementCredit: 0, soldeFinDebit: 2140000, soldeFinCredit: 0 },

      // Produits
      { compte: '706000', libelle: 'Prestations de services informatiques & conseil', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 88000000, soldeFinDebit: 0, soldeFinCredit: 88000000 },
      { compte: '768000', libelle: 'Produits financiers', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 120000, soldeFinDebit: 0, soldeFinCredit: 120000 },
    ]
  }
];

/**
 * Génère et télécharge un fichier Excel réel (.xlsx) pour un exemple donné
 */
export function downloadSampleExcel(sampleId) {
  const sample = SAMPLE_BALANCES.find(s => s.id === sampleId) || SAMPLE_BALANCES[0];
  const wb = XLSX.utils.book_new();

  // En-têtes standard de balance SCF à 6 colonnes de montants
  const headers = [
    'N° Compte',
    'Intitulé du Compte',
    'Solde Début Débit',
    'Solde Début Crédit',
    'Mouvement Débit',
    'Mouvement Crédit',
    'Solde Fin Débit',
    'Solde Fin Crédit'
  ];

  const buildSheetData = (rows) => {
    const data = [headers];
    (rows || []).forEach(r => {
      data.push([
        r.compte,
        r.libelle,
        r.soldeDebutDebit || 0,
        r.soldeDebutCredit || 0,
        r.mouvementDebit || 0,
        r.mouvementCredit || 0,
        r.soldeFinDebit || 0,
        r.soldeFinCredit || 0
      ]);
    });
    return data;
  };

  const wsN = XLSX.utils.aoa_to_sheet(buildSheetData(sample.rowsN));
  XLSX.utils.book_append_sheet(wb, wsN, 'Balance N');

  if (sample.rowsN1 && sample.rowsN1.length > 0) {
    const wsN1 = XLSX.utils.aoa_to_sheet(buildSheetData(sample.rowsN1));
    XLSX.utils.book_append_sheet(wb, wsN1, 'Balance N-1');
  }

  const cleanFilename = `Balance_Exemple_${sample.id}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}
