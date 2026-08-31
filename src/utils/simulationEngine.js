import { calculateBilanFonctionnel, calculateSIG, calculateRatios, calculateBilanSCF } from './financeCalculations';

/* ═══════════════════════════════════════════════════════════
   BAIQ — Moteur de Simulation Comptable en Partie Double
   Support complet des écritures multilignes & modèles SCF
   ═══════════════════════════════════════════════════════════ */

export const MAX_SCENARIOS = 3;

export function createScenario(name) {
  return {
    id: 'scn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: name || 'Scénario',
    entries: [],
    createdAt: Date.now(),
  };
}

export const MODEL_TEMPLATES = [
  {
    id: 'tpl_vente_terme',
    category: 'Ventes',
    name: 'Vente de Marchandises à Terme (Clients)',
    icon: 'point_of_sale',
    description: 'Facturation client avec délai de paiement (Impact BFR & CA)',
    lines: [
      { compte: '411', libelle: 'Clients & comptes rattachés', debit: 500000, credit: 0 },
      { compte: '700', libelle: 'Ventes de marchandises / prestations', debit: 0, credit: 500000 },
    ]
  },
  {
    id: 'tpl_vente_comptant',
    category: 'Ventes',
    name: 'Vente au Comptant par Banque',
    icon: 'payments',
    description: 'Encaissement direct en banque (Impact Trésorerie & CA)',
    lines: [
      { compte: '512', libelle: 'Banque (Trésorerie reçue)', debit: 500000, credit: 0 },
      { compte: '700', libelle: 'Ventes de marchandises', debit: 0, credit: 500000 },
    ]
  },
  {
    id: 'tpl_vente_tva',
    category: 'Ventes',
    name: 'Vente de Marchandises avec TVA (Multiligne)',
    icon: 'receipt_long',
    description: 'Créance client TTC avec Vente HT et TVA collectée',
    lines: [
      { compte: '411', libelle: 'Clients & comptes rattachés (TTC)', debit: 1190000, credit: 0 },
      { compte: '700', libelle: 'Ventes de marchandises (HT)', debit: 0, credit: 1000000 },
      { compte: '445', libelle: 'État - TVA collectée (19%)', debit: 0, credit: 190000 },
    ]
  },
  {
    id: 'tpl_achat_fournisseur',
    category: 'Achats',
    name: 'Achat de Marchandises à Crédit Fournisseur',
    icon: 'shopping_cart',
    description: 'Facture d\'achat avec délai fournisseur (Impact Charges & DPO)',
    lines: [
      { compte: '600', libelle: 'Achats consommés de marchandises', debit: 350000, credit: 0 },
      { compte: '401', libelle: 'Fournisseurs & comptes rattachés', debit: 0, credit: 350000 },
    ]
  },
  {
    id: 'tpl_achat_tva',
    category: 'Achats',
    name: 'Achat de Marchandises avec TVA (Multiligne)',
    icon: 'shopping_bag',
    description: 'Achats HT + TVA déductible et dette fournisseur TTC',
    lines: [
      { compte: '600', libelle: 'Achats consommés (HT)', debit: 1000000, credit: 0 },
      { compte: '445', libelle: 'État - TVA déductible (19%)', debit: 190000, credit: 0 },
      { compte: '401', libelle: 'Fournisseurs (TTC)', debit: 0, credit: 1190000 },
    ]
  },
  {
    id: 'tpl_salaires',
    category: 'Personnel',
    name: 'Charges de Personnel & Salaires du Mois',
    icon: 'group',
    description: 'Comptabilisation des salaires bruts et dettes sociales',
    lines: [
      { compte: '630', libelle: 'Charges de personnel (Salaires)', debit: 250000, credit: 0 },
      { compte: '421', libelle: 'Personnel - Rémunérations dues', debit: 0, credit: 250000 },
    ]
  },
  {
    id: 'tpl_investissement',
    category: 'Investissement',
    name: 'Acquisition d\'Équipement / Immobilisation',
    icon: 'precision_manufacturing',
    description: 'Achat de matériel ou matériel de transport (Compte 21)',
    lines: [
      { compte: '210', libelle: 'Immobilisations corporelles (Matériel)', debit: 800000, credit: 0 },
      { compte: '512', libelle: 'Banque (Décaissement comptant)', debit: 0, credit: 800000 },
    ]
  },
  {
    id: 'tpl_emprunt',
    category: 'Financement',
    name: 'Souscription d\'un Emprunt Bancaire',
    icon: 'account_balance',
    description: 'Déblocage de fonds par la banque (Augmentation ressources stables)',
    lines: [
      { compte: '512', libelle: 'Banque (Trésorerie active)', debit: 1200000, credit: 0 },
      { compte: '164', libelle: 'Emprunts auprès des établissements de crédit', debit: 0, credit: 1200000 },
    ]
  },
  {
    id: 'tpl_reglement_fournisseur',
    category: 'Trésorerie',
    name: 'Règlement Facture Fournisseur',
    icon: 'outbox',
    description: 'Décaissement bancaire pour solder les dettes fournisseurs',
    lines: [
      { compte: '401', libelle: 'Fournisseurs & comptes rattachés', debit: 300000, credit: 0 },
      { compte: '512', libelle: 'Banque (Règlement effectué)', debit: 0, credit: 300000 },
    ]
  },
  {
    id: 'tpl_encaissement_client',
    category: 'Trésorerie',
    name: 'Encaissement Créance Client',
    icon: 'inbox',
    description: 'Rentré de trésorerie en banque pour solder créances clients',
    lines: [
      { compte: '512', libelle: 'Banque (Encaissement reçu)', debit: 400000, credit: 0 },
      { compte: '411', libelle: 'Clients & comptes rattachés', debit: 0, credit: 400000 },
    ]
  },

  // ── PROVISIONS (dotations & reprises — Comptes 15, 29, 39, 49, 68, 78) ──
  {
    id: 'tpl_provision_depreciation_stocks',
    category: 'Provisions',
    name: 'Provision pour Dépréciation des Stocks',
    icon: 'inventory_2',
    description: 'Stock obsolète, invendable ou à rotation lente — constatation d\'une perte de valeur prudente',
    lines: [
      { compte: '6816', libelle: 'Dotations aux provisions pour dépréciation des actifs circulants', debit: 300000, credit: 0 },
      { compte: '39', libelle: 'Pertes de valeur sur stocks', debit: 0, credit: 300000 },
    ]
  },
  {
    id: 'tpl_provision_depreciation_creances',
    category: 'Provisions',
    name: 'Provision pour Créances Clients Douteuses',
    icon: 'money_off',
    description: 'Client en risque d\'impayé — dépréciation prudente de la créance client',
    lines: [
      { compte: '6817', libelle: 'Dotations aux provisions pour dépréciation des créances', debit: 200000, credit: 0 },
      { compte: '49', libelle: 'Pertes de valeur sur comptes clients', debit: 0, credit: 200000 },
    ]
  },
  {
    id: 'tpl_provision_risques_charges',
    category: 'Provisions',
    name: 'Provision pour Risques et Charges (Litige)',
    icon: 'gpp_maybe',
    description: 'Litige en cours, garantie donnée à un client ou risque probable identifié à la clôture',
    lines: [
      { compte: '6815', libelle: 'Dotations aux provisions pour risques et charges', debit: 400000, credit: 0 },
      { compte: '15', libelle: 'Provisions pour risques et charges', debit: 0, credit: 400000 },
    ]
  },
  {
    id: 'tpl_reprise_provision_risques',
    category: 'Provisions',
    name: 'Reprise de Provision pour Risques',
    icon: 'undo',
    description: 'Risque disparu ou litige résolu — annulation de la provision devenue sans objet',
    lines: [
      { compte: '15', libelle: 'Provisions pour risques et charges', debit: 400000, credit: 0 },
      { compte: '7815', libelle: 'Reprises sur provisions pour risques et charges', debit: 0, credit: 400000 },
    ]
  },
  {
    id: 'tpl_reprise_provision_stocks',
    category: 'Provisions',
    name: 'Reprise de Provision sur Stocks',
    icon: 'restart_alt',
    description: 'Stock finalement écoulé ou revalorisé — reprise de la dépréciation constatée antérieurement',
    lines: [
      { compte: '39', libelle: 'Pertes de valeur sur stocks', debit: 300000, credit: 0 },
      { compte: '7816', libelle: 'Reprises sur provisions pour dépréciation des actifs circulants', debit: 0, credit: 300000 },
    ]
  },

  // ── TRAITEMENTS DE CLÔTURE (rattachement à l'exercice — Comptes 28, 408, 418, 486, 487) ──
  {
    id: 'tpl_dotation_amortissements',
    category: 'Clôture',
    name: 'Dotation aux Amortissements de l\'Exercice',
    icon: 'schedule',
    description: 'Constatation de l\'usure annuelle des immobilisations — écriture classique de fin d\'exercice',
    lines: [
      { compte: '681', libelle: 'Dotations aux amortissements des immobilisations', debit: 500000, credit: 0 },
      { compte: '28', libelle: 'Amortissements des immobilisations', debit: 0, credit: 500000 },
    ]
  },
  {
    id: 'tpl_charges_constatees_avance',
    category: 'Clôture',
    name: 'Charges Constatées d\'Avance',
    icon: 'event_repeat',
    description: 'Charge déjà payée mais qui concerne l\'exercice suivant (assurance, loyer, abonnement...)',
    lines: [
      { compte: '486', libelle: 'Charges constatées d\'avance', debit: 150000, credit: 0 },
      { compte: '61', libelle: 'Services extérieurs', debit: 0, credit: 150000 },
    ]
  },
  {
    id: 'tpl_produits_constates_avance',
    category: 'Clôture',
    name: 'Produits Constatés d\'Avance',
    icon: 'calendar_month',
    description: 'Vente déjà facturée mais dont la prestation concerne l\'exercice suivant',
    lines: [
      { compte: '70', libelle: 'Ventes de marchandises / prestations', debit: 200000, credit: 0 },
      { compte: '487', libelle: 'Produits constatés d\'avance', debit: 0, credit: 200000 },
    ]
  },
  {
    id: 'tpl_charges_a_payer',
    category: 'Clôture',
    name: 'Charges à Payer (Factures Non Parvenues)',
    icon: 'receipt_long',
    description: 'Marchandise ou service déjà reçu mais dont la facture fournisseur n\'est pas encore arrivée',
    lines: [
      { compte: '600', libelle: 'Achats consommés de marchandises', debit: 250000, credit: 0 },
      { compte: '408', libelle: 'Fournisseurs, factures non parvenues', debit: 0, credit: 250000 },
    ]
  },
  {
    id: 'tpl_produits_a_recevoir',
    category: 'Clôture',
    name: 'Produits à Recevoir',
    icon: 'task_alt',
    description: 'Prestation déjà réalisée pour un client mais non encore facturée à la date de clôture',
    lines: [
      { compte: '418', libelle: 'Clients, produits à recevoir', debit: 220000, credit: 0 },
      { compte: '700', libelle: 'Ventes de marchandises / prestations', debit: 0, credit: 220000 },
    ]
  }
];

export function createSimulationEntryFromLines({ label, lines = [] }) {
  // Un compte vide n'est jamais deviné (une vente "700" fantôme serait pire qu'une ligne
  // ignorée) : il reste vide et applySimulationToRows() l'ignorera explicitement.
  const cleanLines = lines.map(l => ({
    compte: String(l.compte || '').trim(),
    libelle: String(l.libelle || (l.compte ? `Compte ${l.compte}` : 'Compte')),
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
  }));

  const totalDebit = cleanLines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = cleanLines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return {
    id: 'sim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    date: new Date().toLocaleDateString('fr-FR'),
    label: label || 'Opération simulée',
    lines: cleanLines,
    montant: Math.max(totalDebit, totalCredit),
    isBalanced,
    isSimulation: true,
  };
}

/**
 * Fusionne les écritures de simulation (simples ou multilignes) dans les lignes de la balance générale.
 * Recalcule correctement les soldes finaux Débit/Crédit et apparie avec les comptes sous-jacents (ex: 411000 pour 411).
 */
export function applySimulationToRows(originalRows = [], simulationEntries = []) {
  if (!originalRows || originalRows.length === 0) return [];
  if (!simulationEntries || simulationEntries.length === 0) return originalRows;

  // Clone des lignes existantes
  const rowsCopy = originalRows.map(r => ({ ...r }));

  // Indexation par numéro de compte
  const accountMap = new Map();
  rowsCopy.forEach((r, idx) => {
    if (r.compte) {
      accountMap.set(r.compte.toString().trim(), idx);
    }
  });

  const updateOrAddAccount = (cCode, label, deb, cred) => {
    if (!cCode || (deb === 0 && cred === 0)) return;

    let accIdx = accountMap.get(cCode);

    // Si le compte exact n'est pas trouvé, chercher un compte auxiliaire débutant par cCode
    // (ex: 411000 pour 411). Plusieurs sous-comptes peuvent correspondre (ex: 391/395 pour '39') :
    // on retient celui au solde le plus significatif plutôt que le premier rencontré dans le
    // fichier, pour un rattachement plus représentatif au niveau du détail par compte.
    if (accIdx === undefined && cCode.length <= 4) {
      let bestAbsSolde = -1;
      for (const [code, idx] of accountMap.entries()) {
        if (code.startsWith(cCode)) {
          const r = rowsCopy[idx];
          const s = (r.solde !== undefined && r.solde !== null && !isNaN(r.solde)) ? r.solde : (r.soldeFinDebit || 0) - (r.soldeFinCredit || 0);
          if (Math.abs(s) > bestAbsSolde) { bestAbsSolde = Math.abs(s); accIdx = idx; }
        }
      }
    }

    if (accIdx !== undefined) {
      const row = rowsCopy[accIdx];
      // Le solde actuel s'appuie sur le solde final RÉEL de la ligne (déjà correct quel que
      // soit le format de balance importé — 2, 4 ou 6 colonnes), jamais recalculé depuis
      // soldeDébut+mouvement : sur une balance à 2 colonnes, ces deux champs valent 0 et
      // recalculer ainsi effacerait silencieusement le solde réel du compte.
      const soldeActuel = (row.solde !== undefined && row.solde !== null && !isNaN(row.solde))
        ? row.solde
        : (row.soldeFinDebit || 0) - (row.soldeFinCredit || 0);
      const netFin = soldeActuel + deb - cred;

      row.mouvementDebit  = (row.mouvementDebit || 0) + deb;
      row.mouvementCredit = (row.mouvementCredit || 0) + cred;

      if (netFin >= 0) {
        row.soldeFinDebit  = netFin;
        row.soldeFinCredit = 0;
      } else {
        row.soldeFinDebit  = 0;
        row.soldeFinCredit = -netFin;
      }
      row.solde = netFin;
      row.isSimulationImpacted = true;
    } else {
      const netFin = deb - cred;
      const newRow = {
        compte: cCode,
        libelle: `[SIMULATION] ${label || 'Compte ' + cCode}`,
        soldeDebutDebit: 0,
        soldeDebutCredit: 0,
        mouvementDebit: deb,
        mouvementCredit: cred,
        soldeFinDebit: netFin >= 0 ? netFin : 0,
        soldeFinCredit: netFin < 0 ? -netFin : 0,
        solde: netFin,
        isSimulation: true,
        simulationBadge: 'SIMULATION 📝',
      };
      rowsCopy.push(newRow);
      accountMap.set(cCode, rowsCopy.length - 1);
    }
  };

  simulationEntries.forEach(entry => {
    // Cas 1 : Écriture Multilignes (Nouveau Format)
    if (entry.lines && Array.isArray(entry.lines) && entry.lines.length > 0) {
      entry.lines.forEach(l => {
        updateOrAddAccount(String(l.compte || '').trim(), l.libelle, Number(l.debit) || 0, Number(l.credit) || 0);
      });
      return;
    }

    // Cas 2 : Écriture Simple 2-comptes (Compatibilité rétroactive)
    const amt = Number(entry.montant) || 0;
    if (amt <= 0) return;

    const debCode  = String(entry.debitCompte || '').trim();
    const credCode = String(entry.creditCompte || '').trim();

    if (debCode) updateOrAddAccount(debCode, entry.label, amt, 0);
    if (credCode) updateOrAddAccount(credCode, entry.label, 0, amt);
  });

  return rowsCopy;
}

/**
 * Recalcule entièrement le dataset complet (Bilan, SIG, Ratios) avec les écritures simulées
 */
export function recalculateSimulatedDataset(originalData, simulationEntries = []) {
  if (!originalData || !originalData.rows) return originalData;
  if (!simulationEntries || simulationEntries.length === 0) return originalData;

  const simRows = applySimulationToRows(originalData.rows, simulationEntries);
  const payload = { isBalance: true, rows: simRows };

  const simBilan    = calculateBilanFonctionnel(payload);
  const simSIG      = calculateSIG(payload);
  const simRatios   = calculateRatios(simBilan, simSIG, simRows);
  const simBilanSCF = calculateBilanSCF(payload, simSIG);

  return {
    rows: simRows,
    bilan: simBilan,
    sig: simSIG,
    ratios: simRatios,
    bilanSCF: simBilanSCF,
    profil: originalData.profil,
    dataN1: originalData.dataN1,
    isSimulationMode: true,
    simulationEntriesCount: simulationEntries.length,
  };
}
