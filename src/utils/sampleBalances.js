/**
 * ═══════════════════════════════════════════════════════════════
 * BALANCES DE DÉMONSTRATION & JEUX D'ESSAI SCF (Algérie — Loi 07-11)
 * 1. Balance Réelle Entreprise Algérie 2026 (130 comptes)
 * 2. Balance Réelle Groupe Industriel IBAI 2025 (780 comptes)
 * 3. Dossier Spécial Audit & Rapprochements SCF
 * ═══════════════════════════════════════════════════════════════
 */

import realDataAlgerie2026 from './realDataAlgerie2026.json';
import realDataIbai2025 from './realDataIbai2025.json';

export const SAMPLE_BALANCES = [
  {
    id: 'balance_algerie_2026',
    title: 'CAS RÉEL : ENTREPRISE INDUSTRIELLE ALGÉRIE 2026',
    subtitle: 'Production & Transformation (130 comptes SCF réels)',
    secteurId: 'industrie',
    effectif: 45,
    caN: '130 Comptes Réels',
    description: 'Balance réelle de production industrielle algérienne (IBS 19% - SCF 2026) avec comptes de liaison (181), investissements d\'équipements (215/218), stocks de matières (310), clients et fournisseurs.',
    badge: '🏭 Production Réelle 2026',
    badgeColor: '#7c3aed',
    rowsN: realDataAlgerie2026
  },
  {
    id: 'balance_ibaiben_2025',
    title: 'CAS RÉEL : GROUPE INDUSTRIEL IBAIBEN 2025',
    subtitle: 'Grande industrie de production (780 comptes SCF réels)',
    secteurId: 'industrie',
    effectif: 180,
    caN: '780 Comptes Détaillés',
    description: 'Balance réelle complète de grand groupe de production (IBS 19%) : parcs d\'usines, lignes de production, dépréciations, impôts différés (133) et sous-traitances industrielles.',
    badge: '🏭 Production Groupe IBAIBEN',
    badgeColor: '#059669',
    rowsN: realDataIbai2025
  },
  {
    id: 'special_audit_scf',
    title: 'DOSSIER TEST AUDIT & RAPPROCHEMENTS SCF',
    subtitle: 'Modèle de test d\'audit (Jointures parfaites + anomalies de contrôle)',
    secteurId: 'services_entreprises',
    effectif: 40,
    caN: '88 000 000 DA',
    description: 'Spécifiquement conçu pour tester le module d\'Audit SCF : symétries de comptes (681513 ↔ 281513, 681511 ↔ 281511, 381 ↔ 31), comptes de liaison soldés et calcul automatique des jointures.',
    badge: '🔍 Spécial Audit SCF',
    badgeColor: '#8b5cf6',
    rowsN: [
      { compte: '101000', libelle: 'Capital social', soldeDebutDebit: 0, soldeDebutCredit: 15000000, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 15000000 },
      { compte: '106100', libelle: 'Réserve légale', soldeDebutDebit: 0, soldeDebutCredit: 1500000, mouvementDebit: 0, mouvementCredit: 500000, soldeFinDebit: 0, soldeFinCredit: 2000000 },
      { compte: '110000', libelle: 'Report à nouveau', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 2500000, soldeFinDebit: 0, soldeFinCredit: 2500000 },
      { compte: '120000', libelle: 'Résultat N-1 (Ouverture)', soldeDebutDebit: 0, soldeDebutCredit: 5000000, mouvementDebit: 5000000, mouvementCredit: 0, soldeFinDebit: 0, soldeFinCredit: 0 },
      { compte: '181000', libelle: 'Comptes de liaison entre établissements', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 85955423, mouvementCredit: 85955423, soldeFinDebit: 0, soldeFinCredit: 0 },
      { compte: '215110', libelle: 'Matériel de transport lourd', soldeDebutDebit: 8000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 8000000, soldeFinCredit: 0 },
      { compte: '215130', libelle: 'Équipements informatiques et serveurs', soldeDebutDebit: 5500000, soldeDebutCredit: 0, mouvementDebit: 1200000, mouvementCredit: 0, soldeFinDebit: 6700000, soldeFinCredit: 0 },
      { compte: '218400', libelle: 'Mobilier de bureau', soldeDebutDebit: 2000000, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 0, soldeFinDebit: 2000000, soldeFinCredit: 0 },
      { compte: '281511', libelle: 'Amortissement matériel transport lourd', soldeDebutDebit: 0, soldeDebutCredit: 3200000, mouvementDebit: 0, mouvementCredit: 1600000, soldeFinDebit: 0, soldeFinCredit: 4800000 },
      { compte: '281513', libelle: 'Amortissement équipements informatiques', soldeDebutDebit: 0, soldeDebutCredit: 2200000, mouvementDebit: 0, mouvementCredit: 1340000, soldeFinDebit: 0, soldeFinCredit: 3540000 },
      { compte: '281840', libelle: 'Amortissement mobilier de bureau', soldeDebutDebit: 0, soldeDebutCredit: 800000, mouvementDebit: 0, mouvementCredit: 200000, soldeFinDebit: 0, soldeFinCredit: 1000000 },
      { compte: '310001', libelle: 'Fournitures consommables A', soldeDebutDebit: 1200000, soldeDebutCredit: 0, mouvementDebit: 14500000, mouvementCredit: 14200000, soldeFinDebit: 1500000, soldeFinCredit: 0 },
      { compte: '381001', libelle: 'Achats fournitures stockées A', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 14500000, mouvementCredit: 14500000, soldeFinDebit: 0, soldeFinCredit: 0 },
      { compte: '401100', libelle: 'Fournisseurs d\'exploitation', soldeDebutDebit: 0, soldeDebutCredit: 6200000, mouvementDebit: 32500000, mouvementCredit: 34100000, soldeFinDebit: 0, soldeFinCredit: 7800000 },
      { compte: '411100', libelle: 'Clients prestations', soldeDebutDebit: 12400000, soldeDebutCredit: 0, mouvementDebit: 104720000, mouvementCredit: 101120000, soldeFinDebit: 16000000, soldeFinCredit: 0 },
      { compte: '512100', libelle: 'Banque BNA', soldeDebutDebit: 4800000, soldeDebutCredit: 0, mouvementDebit: 88500000, mouvementCredit: 87300000, soldeFinDebit: 6000000, soldeFinCredit: 0 },
      { compte: '580000', libelle: 'Virements internes', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 9500000, mouvementCredit: 9500000, soldeFinDebit: 0, soldeFinCredit: 0 },
      { compte: '601001', libelle: 'Consommations fournitures A', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 14200000, mouvementCredit: 0, soldeFinDebit: 14200000, soldeFinCredit: 0 },
      { compte: '631000', libelle: 'Salaires du personnel', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 32000000, mouvementCredit: 0, soldeFinDebit: 32000000, soldeFinCredit: 0 },
      { compte: '681511', libelle: 'Dotations amort. matériel transport lourd', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1600000, mouvementCredit: 0, soldeFinDebit: 1600000, soldeFinCredit: 0 },
      { compte: '681513', libelle: 'Dotations amort. équipements informatiques', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 1340000, mouvementCredit: 0, soldeFinDebit: 1340000, soldeFinCredit: 0 },
      { compte: '681840', libelle: 'Dotations amort. mobilier de bureau', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 200000, mouvementCredit: 0, soldeFinDebit: 200000, soldeFinCredit: 0 },
      { compte: '695000', libelle: 'IBS (Impôt sur les bénéfices)', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 2140000, mouvementCredit: 0, soldeFinDebit: 2140000, soldeFinCredit: 0 },
      { compte: '706000', libelle: 'Prestations de services et conseil', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 88000000, soldeFinDebit: 0, soldeFinCredit: 88000000 },
      { compte: '768000', libelle: 'Produits financiers', soldeDebutDebit: 0, soldeDebutCredit: 0, mouvementDebit: 0, mouvementCredit: 120000, soldeFinDebit: 0, soldeFinCredit: 120000 },
    ]
  }
];

/**
 * Génère et télécharge un fichier Excel réel (.xlsx) pour un exemple donné.
 * xlsx est chargé dynamiquement (cf. parseFile) : cette fonction n'est appelée qu'au
 * clic sur « Télécharger cet exemple », il serait inutile d'en peser le bundle initial.
 */
export async function downloadSampleExcel(sampleId) {
  const sample = SAMPLE_BALANCES.find(s => s.id === sampleId) || SAMPLE_BALANCES[0];
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

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

  const cleanFilename = `Balance_${sample.id}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}
