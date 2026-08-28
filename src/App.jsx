import { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie 
} from 'recharts';
import { ImportData } from './components/ImportData';
import { BilanView } from './components/BilanView';
import { SIGView } from './components/SIGView';
import { CapitauxPropresView } from './components/CapitauxPropresView';
import { RatiosView } from './components/RatiosView';
import { BalanceView } from './components/BalanceView';
import { AuditBalanceView } from './components/AuditBalanceView';
import { StockView } from './components/StockView';
import { ReportsView } from './components/ReportsView';
import { AIView } from './components/AIView';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { CalculationsIndexView } from './components/CalculationsIndexView';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { PresentationView } from './components/PresentationView';
import { exportFinancialWorkbook } from './utils/excelExporter';
import { generateFullPDF } from './utils/pdfExporter';
import { calculateStockEvolution } from './utils/financeCalculations';
import { recalculateSimulatedDataset } from './utils/simulationEngine';
import { SECTEURS } from './utils/secteurs';

/* Avatar supprimé — on utilise des initiales */

const NAV = [
  { id: 'import',      label: 'Importation',           icon: 'upload_file'   },
  { id: 'dashboard',   label: "Vue d'ensemble",         icon: 'dashboard'     },
  { id: 'balance',     label: 'Balance Générale',       icon: 'account_balance'},
  { id: 'audit',       label: 'Audit Balance (SCF)',    icon: 'fact_check'    },
  { id: 'bilan',       label: 'Bilan Fonctionnel',      icon: 'account_tree'  },
  { id: 'sig',         label: 'SIG & TCR (SCF)',        icon: 'analytics'     },
  { id: 'capitaux',    label: 'Capitaux Propres (TVCP)', icon: 'account_balance_wallet' },
  { id: 'stocks',      label: 'Variation Stocks',       icon: 'warehouse'     },
  { id: 'ratios',      label: 'Ratios Financiers',      icon: 'query_stats'   },
  { id: 'whatif',      label: 'Simulateur What-If',     icon: 'tune'          },
  { id: 'methodology', label: 'Index des Calculs',      icon: 'menu_book'     },
  { id: 'reports',     label: 'Rapports',               icon: 'description'   },
  { id: 'ai',          label: 'Assistant IA',           icon: 'smart_toy'     },
];

export default function App() {
  const [tab, setTab]       = useState('import');
  const [data, setData]     = useState(null);
  const [cur, setCur]       = useState('DZD');
  const [geminiKey, setGeminiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('finanalyze_gemini_key') || '');
  const [theme, setTheme]   = useState(() => localStorage.getItem('finanalyze_theme') || 'light');
  const [showContactModal, setShowContactModal] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(() => parseInt(localStorage.getItem('baiq_analysis_count') || '0', 10));
  
  /* ── Recherche Avancée (Ctrl+K) & Mode Présentation DAF ── */
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* ── Moteur de Simulation ── */
  const [simulationEntries, setSimulationEntries] = useState([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  // Active dataset (Real vs Simulated)
  const activeData = useMemo(() => {
    if (isSimulationActive && simulationEntries.length > 0 && data) {
      return recalculateSimulatedDataset(data, simulationEntries);
    }
    return data;
  }, [data, simulationEntries, isSimulationActive]);

  // Appliquer le thème sur document.documentElement
  useState(() => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('finanalyze_theme', nextTheme);
  };

  const fmt = (v) => {
    const num = Math.round(Number(v) || 0);
    const sign = num < 0 ? '-' : '';
    return `${sign}${Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${cur}`;
  };

  const fmtPct = (p) => {
    if (p === undefined || p === null || isNaN(p)) return '0.0%';
    const prefix = p > 0 ? '+' : '';
    return `${prefix}${Number(p).toFixed(1)}%`;
  };

  const onImported = (d) => {
    setData(d);
    setTab('dashboard');
    const newCount = (parseInt(localStorage.getItem('baiq_analysis_count') || '0', 10)) + 1;
    localStorage.setItem('baiq_analysis_count', String(newCount));
    setAnalysisCount(newCount);
  };

  const updateSecteur = (secteurId) => {
    setData(prev => prev ? {
      ...prev,
      profil: { ...(prev.profil || {}), secteurId }
    } : prev);
  };

  /* ── Totaux Annuels Produits vs Charges (Sans détail) ── */
  const annualTotals = useMemo(() => {
    let totP = 0, totC = 0;
    if (activeData?.rows && activeData.rows.length > 0) {
      activeData.rows.forEach(r => {
        if (r.ignore || !r.compte) return;
        const c = r.compte.toString().trim();
        const deb = Number(r.soldeFinDebit !== undefined ? r.soldeFinDebit : r.debit) || 0;
        const cred = Number(r.soldeFinCredit !== undefined ? r.soldeFinCredit : r.credit) || 0;
        const v = r.solde !== undefined && r.solde !== null ? r.solde : (deb - cred);
        const absV = Math.abs(v);
        if (c.startsWith('7')) totP += absV;
        else if (c.startsWith('6')) totC += absV;
      });
    } else {
      totP = (activeData?.sig?.chiffreAffaires || 1200000) + 260000;
      totC = totP - (activeData?.sig?.resultatNet || 150000);
    }
    const net = totP - totC;
    return {
      totP,
      totC,
      net,
      bars: [
        { name: 'Produits (Cl. 7)', Montant: totP, color: '#2563eb' },
        { name: 'Charges (Cl. 6)',  Montant: totC, color: '#059669' },
        { name: 'Résultat Net',     Montant: net,  color: net >= 0 ? '#059669' : '#dc2626' },
      ]
    };
  }, [activeData]);

  /* ── Expenses breakdown (Nomenclature SCF Algérie) ── */
  const expenses = useMemo(() => {
    let a=0, s=0, p=0, i=0, o=0;
    const hasRows = activeData?.rows && activeData.rows.length > 0;
    if (hasRows) {
      activeData.rows.forEach(r => {
        if (r.ignore || !r.compte) return;
        const c = r.compte.toString().trim();
        const deb = Number(r.soldeFinDebit !== undefined ? r.soldeFinDebit : r.debit) || 0;
        const cred = Number(r.soldeFinCredit !== undefined ? r.soldeFinCredit : r.credit) || 0;
        const v = r.solde !== undefined && r.solde !== null ? r.solde : (deb - cred);
        const absV = Math.abs(v);
        if (c.startsWith('60')) a += absV;
        else if (c.startsWith('61') || c.startsWith('62')) s += absV;
        else if (c.startsWith('63')) p += absV; // SCF : 63 = Personnel
        else if (c.startsWith('64')) i += absV; // SCF : 64 = Impôts et taxes
        else if (c.startsWith('6'))  o += absV;
      });
    }

    const tot = a + s + p + i + o;
    if (tot > 0) {
      return [
        { label: 'Achats consommés (60)',       val: a, color: '#2563eb' },
        { label: 'Services extérieurs (61/62)', val: s, color: '#059669' },
        { label: 'Charges de personnel (63)',   val: p, color: '#d97706' },
        { label: 'Impôts & taxes (64)',          val: i, color: '#7c3aed' },
        { label: 'Autres charges (65/68)',      val: o, color: '#94a3b8' },
      ].map(x => ({ ...x, pct: Number(((x.val / tot) * 100).toFixed(1)) }));
    }

    // Fallback démo équilibré si aucune balance chargée
    return [
      { label: 'Achats consommés (60)',       val: 342000, color: '#2563eb', pct: 39.1 },
      { label: 'Services extérieurs (61/62)', val: 156000, color: '#059669', pct: 17.8 },
      { label: 'Charges de personnel (63)',   val: 289000, color: '#d97706', pct: 33.1 },
      { label: 'Impôts & taxes (64)',          val: 42000,  color: '#7c3aed', pct: 4.8 },
      { label: 'Autres charges (65/68)',      val: 45000,  color: '#94a3b8', pct: 5.1 },
    ];
  }, [activeData]);

  /* ── Évolution des stocks par catégorie ── */
  const stockData = useMemo(() => {
    const computed = calculateStockEvolution(activeData?.rows);
    if (computed && computed.categories && computed.categories.length > 0) {
      return computed;
    }
    // Données par défaut pour démonstration / vue d'ensemble
    const demoCats = [
      { code: '30', label: '30 — Stock de Marchandises', icon: 'inventory_2', stockInitial: 450000, stockFinal: 520000, variation: 70000, pctVariation: 15.6, mouvement: 'STOCKAGE', badgeCls: 'badge-green', impactSCF: 'Réduction des charges consommées (Compte 603)' },
      { code: '31', label: '31 — Matières Premières', icon: 'category', stockInitial: 310000, stockFinal: 280000, variation: -30000, pctVariation: -9.7, mouvement: 'DÉSTOCKAGE', badgeCls: 'badge-red', impactSCF: 'Augmentation des charges consommées (Compte 603)' },
      { code: '35', label: '35 — Stocks de Produits Finis', icon: 'widgets', stockInitial: 180000, stockFinal: 215000, variation: 35000, pctVariation: 19.4, mouvement: 'STOCKAGE', badgeCls: 'badge-green', impactSCF: 'Augmentation de la production (Compte 72)' },
      { code: '32', label: '32 — Autres Approvisionnements', icon: 'box', stockInitial: 45000, stockFinal: 48000, variation: 3000, pctVariation: 6.7, mouvement: 'STOCKAGE', badgeCls: 'badge-green', impactSCF: 'Réduction des charges consommées (Compte 603)' }
    ];
    return {
      categories: demoCats,
      totalInitial: 985000,
      totalFinal: 1063000,
      totalVariation: 78000,
      totalPctVariation: 7.9,
      globalMouvement: 'STOCKAGE'
    };
  }, [activeData]);

  /* ── Détection des soldes anormaux — SCF (Système Comptable Financier, Algérie) ──────
   *
   *  CLASSE 1 — Comptes de capitaux                   → normalement CRÉDITEURS
   *    10 Capital                                      → CRÉDITEUR
   *    11 Réserves                                     → CRÉDITEUR
   *    12 Résultat net                                 → CRÉDITEUR (bénéfice) | DÉBITEUR (perte) ✓ admis
   *    13 Report à nouveau                             → CRÉDITEUR (excédent) | DÉBITEUR (déficit) ✓ admis
   *    14 Résultat en instance d'affectation           → CRÉDITEUR
   *    15 Provisions & produits constatés d'avance     → CRÉDITEUR
   *    16 Emprunts & dettes financières                → CRÉDITEUR
   *    17 Dettes rattachées à des participations       → CRÉDITEUR
   *    19 Amortissements dérogatoires/fonds propres    → CRÉDITEUR
   *
   *  CLASSE 2 — Comptes d'immobilisations             → normalement DÉBITEURS
   *    20 Immob. incorporelles                        → DÉBITEUR
   *    21 Immob. corporelles                          → DÉBITEUR
   *    22 Immob. mises en concession                  → DÉBITEUR
   *    23 Immob. en cours                             → DÉBITEUR
   *    25 Titres mis en équivalence                   → DÉBITEUR
   *    26 Participations & créances rattachées        → DÉBITEUR
   *    27 Autres immob. financières                   → DÉBITEUR
   *    28 Amortissements des immobilisations          → CRÉDITEUR (comptes soustractifs)
   *    29 Pertes de valeur sur immobilisations        → CRÉDITEUR (comptes soustractifs)
   *
   *  CLASSE 3 — Comptes de stocks                    → normalement DÉBITEURS
   *    30-38 Stocks divers                            → DÉBITEUR
   *    39 Pertes de valeur sur stocks                 → CRÉDITEUR (comptes soustractifs)
   *
   *  CLASSE 4 — Comptes de tiers
   *    40 Fournisseurs & comptes rattachés            → CRÉDITEUR  (anormal si débiteur)
   *    41 Clients & comptes rattachés                 → DÉBITEUR   (anormal si créditeur)
   *    42 Personnel & comptes rattachés               → CRÉDITEUR  (anormal si débiteur)
   *    43 Organismes sociaux                          → CRÉDITEUR  (anormal si débiteur)
   *    44 État & collectivités publiques              → variable
   *       441 Impôts sur bénéfices                   → CRÉDITEUR
   *       444 État - TVA collectée                   → CRÉDITEUR
   *       445 État - TVA déductible/remboursable      → DÉBITEUR   ✓ admis
   *       447 Autres impôts & taxes                  → CRÉDITEUR
   *    45 Groupe & associés                           → variable selon sens
   *    46 Débiteurs divers                            → DÉBITEUR   (anormal si créditeur)
   *    47 Comptes transitoires / d'attente            → à solder (toujours alerté)
   *    48 Comptes de régularisation                   → variable
   *    49 Pertes de valeur sur comptes de tiers       → CRÉDITEUR (soustractifs)
   *
   *  CLASSE 5 — Comptes financiers                   → normalement DÉBITEURS
   *    50 Valeurs mobilières de placement             → DÉBITEUR
   *    51 Banques, établissements financiers          → DÉBITEUR   (anormal si créditeur)
   *    532 Caisse dinars                              → DÉBITEUR   (JAMAIS créditeur !)
   *    534 Caisse devises                             → DÉBITEUR   (JAMAIS créditeur !)
   *    54 Régies d'avances & accréditifs              → DÉBITEUR
   *    58 Virements internes                          → soldé en fin de période (alerté si solde)
   *    59 Pertes de valeur sur actifs financiers      → CRÉDITEUR (soustractifs)
   *
   *  CLASSE 6 — Comptes de charges                   → normalement DÉBITEURS
   *  CLASSE 7 — Comptes de produits                  → normalement CRÉDITEURS
   * ──────────────────────────────────────────────────────────────────────────── */
  const detectAnomaly = (compte, soldeDebit, soldeCredit) => {
    if (!compte) return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
    const c   = compte.toString().replace(/\s/g, '');
    const cl  = c[0];
    const p2  = c.slice(0, 2);  // 2 premiers chiffres
    const p3  = c.slice(0, 3);  // 3 premiers chiffres
    const p4  = c.slice(0, 4);  // 4 premiers chiffres
    const sd  = Math.abs(soldeDebit  || 0);
    const sc  = Math.abs(soldeCredit || 0);
    const isD = sd > 0.01 && sc < 0.01;   // solde débiteur
    const isC = sc > 0.01 && sd < 0.01;   // solde créditeur
    const R   = (s, m, mt, cls) => ({ anomalie: true, sens: s, motif: m, montant: mt, cls });

    // ── COMPTES MIXTES ET FLUIDES (DÉBITEUR OU CRÉDITEUR ADMIS) → IGNORER ──────
    // 133, 134 : Subventions d'investissement/équipement (transférées / reportées)
    // 444 : État - Impôts sur les bénéfices / Liquidation IBS (crédit ou dette)
    // 455 : Associés - Comptes courants (apports ou retraits autorisés)
    // 467 : Autres comptes de régularisation / créances et dettes transitoires
    // 517 : Autres organismes financiers / comptes spécifiques
    // 69x : Impôts sur les résultats (692, 693, 695, 698, 699, etc. - charge ou produit d'impôt différé/régul)
    // 723, 724, 725 : Variation des stocks (déstockage = débiteur, stockage = créditeur)
    if (p2 === '69' || ['133','134','444','455','467','517','603','723','724','725'].includes(p3) || p4 === '6992') {
      return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
    }

    // ── CLASSE 1 : Capitaux ──────────────────────────────────────────────────
    if (cl === '1') {
      // 12 Résultat & 13 Report à nouveau : peuvent légitimement être débiteurs
      if (['12','13'].includes(p2)) return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
      // Tous les autres comptes de classe 1 → créditeurs
      if (isD) return R('DÉBITEUR ANORMAL', `Capital/réserves/emprunts (${p2}x) : normalement créditeur`, sd, 'badge-red');
    }

    // ── CLASSE 2 : Immobilisations ───────────────────────────────────────────
    if (cl === '2') {
      if (['28','29'].includes(p2)) {
        // Amortissements & pertes de valeur → créditeurs (soustractifs)
        if (isD) return R('DÉBITEUR ANORMAL', `Amortissement/perte de valeur (${p2}x) : normalement créditeur`, sd, 'badge-amber');
      } else {
        // Immobilisations → débiteurs
        if (isC) return R('CRÉDITEUR ANORMAL', `Immobilisation (${p2}x) : normalement débitrice`, sc, 'badge-red');
      }
    }

    // ── CLASSE 3 : Stocks ────────────────────────────────────────────────────
    if (cl === '3') {
      if (p2 === '39') {
        // Pertes de valeur sur stocks → créditeurs
        if (isD) return R('DÉBITEUR ANORMAL', 'Perte de valeur sur stock (39x) : normalement créditrice', sd, 'badge-amber');
      } else {
        if (isC) return R('CRÉDITEUR ANORMAL', `Stock (${p2}x) : normalement débiteur — rupture ou erreur de saisie ?`, sc, 'badge-red');
      }
    }

    // ── CLASSE 4 : Tiers ─────────────────────────────────────────────────────
    if (cl === '4') {

      // ── 40x — Fournisseurs ──
      if (p2 === '40') {
        // EXCEPTION 406 : Fournisseurs - Retenues de garantie (débiteur admis)
        if (p3 === '406') return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
        // EXCEPTION 409 : Fournisseurs débiteurs — Avances & acomptes versés (débiteur normal)
        if (p3 === '409') return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
        // Tous les autres 40x → normalement créditeurs
        if (isD) return R('DÉBITEUR ANORMAL', 'Fournisseur (40x) : normalement créditeur — acompte versé ou trop-payé ? (vérifier si 406/409)', sd, 'badge-amber');
      }

      // ── 41x — Clients ──
      if (p2 === '41') {
        // EXCEPTION 419 : Clients créditeurs — Avances & acomptes reçus (créditeur normal)
        if (p3 === '419') return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
        // Tous les autres 41x → normalement débiteurs
        if (isC) return R('CRÉDITEUR ANORMAL', 'Client (41x) : normalement débiteur — avoir non imputé ou trop-perçu ? (vérifier si 419)', sc, 'badge-amber');
      }

      // ── 42x — Personnel ──
      if (p2 === '42') {
        // EXCEPTION 425 : Personnel - Avances et acomptes versés → NATURE DÉBITRICE (débiteur normal)
        if (p3 === '425') {
          if (isC) return R('CRÉDITEUR ANORMAL', 'Personnel - Avances (425x) : de nature débitrice (anormal si créditeur)', sc, 'badge-amber');
          return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
        }
        // 421/427 Rémunérations dues → normalement créditeurs
        if (isD) return R('DÉBITEUR ANORMAL', 'Personnel (42x) : normalement créditeur — avance non régularisée ? (vérifier si 425)', sd, 'badge-amber');
      }

      // ── 43x — Organismes sociaux : normalement créditeurs ──
      if (p2 === '43') {
        if (isD) return R('DÉBITEUR ANORMAL', 'Organisme social (43x) : normalement créditeur — trop-versé de cotisations ?', sd, 'badge-amber');
      }

      // ── 44x — État ──
      if (p2 === '44') {
        // 445 TVA déductible / remboursable → légitimement débitrice
        if (p3 === '445') { /* admis */ }
        else if (isD) {
          return R('DÉBITEUR ANORMAL', `Compte d'État (${p3}) : normalement créditeur — trop-versé d'impôt ou crédit TVA ?`, sd, 'badge-amber');
        }
      }

      // ── 46x — Débiteurs divers (hors 467 ignoré) : normalement débiteurs ──
      if (p2 === '46') {
        if (isC) return R('CRÉDITEUR ANORMAL', 'Débiteurs divers (46x) : normalement débiteur', sc, 'badge-amber');
      }

      // ── 47x — Comptes transitoires/d'attente : doivent être soldés ──
      if (p2 === '47') {
        const mt = sd + sc;
        if (mt > 0.01) return R('SOLDE EN SUSPENS', "Compte d'attente (47x) : doit être soldé — régularisation en attente", mt, 'badge-amber');
      }

      // ── 49x — Pertes de valeur sur tiers : créditeurs (soustractifs) ──
      if (p2 === '49') {
        if (isD) return R('DÉBITEUR ANORMAL', 'Perte de valeur sur tiers (49x) : normalement créditrice', sd, 'badge-amber');
      }
    }

    // ── CLASSE 5 : Comptes financiers ────────────────────────────────────────
    if (cl === '5') {

      // ── 59x — Pertes de valeur : créditeurs (soustractifs) ──
      if (p2 === '59') {
        if (isD) return R('DÉBITEUR ANORMAL', 'Perte de valeur sur actif financier (59x) : normalement créditrice', sd, 'badge-amber');
      }

      // ── 58x — Virements internes : doivent être soldés en fin de période ──
      if (p2 === '58') {
        const mt = sd + sc;
        if (mt > 0.01) return R('SOLDE EN SUSPENS', 'Virement interne (58x) : doit être soldé en fin de période', mt, 'badge-amber');
      }

      // ── 532/534/531/533 — Caisse : JAMAIS créditrice ──
      if (['531','532','533','534'].includes(p3)) {
        if (isC) return R('CRÉDITEUR ANORMAL — CAISSE', '⚠ La caisse ne peut physiquement pas être créditrice — erreur de saisie majeure !', sc, 'badge-red');
      }

      // ── 512x — Banques & comptes assimilés ──
      if (p3 === '512' || c.startsWith('512')) {
        if (isC) return R('FACILITÉ DE CAISSE ?', '512 créditeur : découvert autorisé (facilité de caisse) ou à reclasser en 5186 si non contractuel', sc, 'badge-amber');
      }

      // ── 51x (hors 512) & 50x & 54x — Trésorerie : normalement débiteurs ──
      if (['50','54'].includes(p2) || (p2 === '51' && !c.startsWith('512'))) {
        if (isC) return R('CRÉDITEUR ANORMAL', `Trésorerie (${p2}x) : normalement débitrice — vérifier convention bancaire`, sc, 'badge-red');
      }
    }

    // ── CLASSE 6 : Charges ───────────────────────────────────────────────────
    if (cl === '6') {
      // EXCEPTION 609/619/629 : RRR obtenus (créditeur normal)
      if (p3 === '609' || p3 === '619' || p3 === '629') return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
      // EXCEPTION 692 : Participation salariés (MIXTE — créditeur admis : extourne, résultat déficitaire)
      if (c.startsWith('692')) return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
      // Tous les autres comptes de classe 6 → normalement débiteurs
      if (isC) return R('CRÉDITEUR ANORMAL', `Charge (${p2}x) : normalement débitrice — extourne, OD ou erreur d'imputation ? (vérifier si RRR 609)`, sc, 'badge-amber');
    }

    // ── CLASSE 7 : Produits ──────────────────────────────────────────────────
    if (cl === '7') {
      // EXCEPTION 709 : RRR accordés (débiteur normal)
      if (p3 === '709') return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
      // EXCEPTION 724 : Production immobilisée corporelle (MIXTE — débiteur admis : annulation, correction)
      if (c.startsWith('724')) return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
      // Tous les autres comptes de classe 7 → normalement créditeurs
      if (isD) return R('DÉBITEUR ANORMAL', `Produit (${p2}x) : normalement créditeur — extourne ou erreur d'imputation ? (vérifier si RRR 709)`, sd, 'badge-red');
    }

    return { anomalie: false, sens: null, motif: '', montant: 0, cls: 'badge-green' };
  };

  /* ── Comptes à alerter (SCF) ── */
  const notableRows = useMemo(() => {
    return activeData?.rows
      ? (() => {
          const anomalies = activeData.rows
            .filter(r => !r.isTotal && r.compte)
            .map(r => {
              const result = detectAnomaly(r.compte, r.soldeFinDebit, r.soldeFinCredit);
              return { ...r, ...result };
            })
            .filter(r => r.anomalie)
            .sort((a, b) => (b.montant || 0) - (a.montant || 0))
            .slice(0, 10);
          if (anomalies.length === 0) {
            return activeData.rows
              .filter(r => !r.isTotal && r.compte)
              .sort((a,b) => Math.abs(b.solde) - Math.abs(a.solde))
              .slice(0, 5)
              .map(r => ({ ...r, anomalie: false, sens: 'CONFORME', motif: 'Solde conforme aux règles SCF', cls: 'badge-green' }));
          }
          return anomalies;
        })()
      : [
          { compte:'411200', libelle:'Clients ordinaires - Avoirs non imputés',  soldeFinDebit:0,     soldeFinCredit:38500, anomalie:true, sens:'CRÉDITEUR ANORMAL',          motif:'Client (41x) : normalement débiteur — avoir non imputé ou trop-perçu ?',          montant:38500, cls:'badge-amber' },
          { compte:'401500', libelle:'Fournisseurs - Acomptes sur commandes',    soldeFinDebit:12450, soldeFinCredit:0,     anomalie:true, sens:'DÉBITEUR ANORMAL',           motif:'Fournisseur (40x) : normalement créditeur — acompte versé ou trop-payé ?',         montant:12450, cls:'badge-amber' },
          { compte:'512000', libelle:'Banque BNA - Compte courant',              soldeFinDebit:0,     soldeFinCredit:9800,  anomalie:true, sens:'CRÉDITEUR ANORMAL',          motif:'Trésorerie (51x) : normalement débitrice — découvert bancaire non reclassé en 52x ?', montant:9800, cls:'badge-red'   },
          { compte:'532000', libelle:'Caisse principale (dinars)',               soldeFinDebit:0,     soldeFinCredit:3200,  anomalie:true, sens:'CRÉDITEUR ANORMAL — CAISSE', motif:'⚠ Caisse ne peut physiquement pas être créditrice — erreur comptable majeure !',    montant:3200, cls:'badge-red'   },
          { compte:'471000', libelle:"Compte d'attente - Opérations à répartir", soldeFinDebit:5600,  soldeFinCredit:0,     anomalie:true, sens:'SOLDE EN SUSPENS',           motif:"Compte d'attente (47x) : doit être soldé — régularisation en attente",              montant:5600, cls:'badge-amber' },
          { compte:'706000', libelle:'Produits des activités annexes',           soldeFinDebit:1800,  soldeFinCredit:0,     anomalie:true, sens:'DÉBITEUR ANORMAL',           motif:"Produit (70x) : normalement créditeur — extourne ou erreur d'imputation ?",         montant:1800, cls:'badge-red'   },
        ];
  }, [activeData]);

  const screenTitle = NAV.find(n => n.id === tab)?.label.toUpperCase() || 'BAIQ — BALANCE AND FINANCIAL ANALYTICS';


  /* ────────────────── RENDER ────────────────── */
  const renderContent = () => {
    if (tab === 'import')   return <ImportData onDataImported={onImported} />;
    if (tab === 'balance')  return <BalanceView rows={activeData?.rows} formatCurrency={fmt} />;
    if (tab === 'audit')    return <AuditBalanceView rows={activeData?.rows} formatCurrency={fmt} />;
    if (tab === 'bilan')    return <BilanView data={activeData?.bilan} dataN1={activeData?.dataN1} rows={activeData?.rows} formatCurrency={fmt} />;
    if (tab === 'sig')      return <SIGView data={activeData?.sig} rows={activeData?.rows} formatCurrency={fmt} profil={activeData?.profil} />;
    if (tab === 'capitaux') return <CapitauxPropresView data={activeData} fmt={fmt} />;
    if (tab === 'stocks')   return <StockView rows={activeData?.rows} ratios={activeData?.ratios} formatCurrency={fmt} />;
    if (tab === 'ratios')   return <RatiosView data={activeData?.ratios} bilan={activeData?.bilan} sig={activeData?.sig} rows={activeData?.rows} formatCurrency={fmt} profil={activeData?.profil} />;
    if (tab === 'whatif')      return <WhatIfSimulator data={data} simulationEntries={simulationEntries} setSimulationEntries={setSimulationEntries} isSimulationActive={isSimulationActive} setIsSimulationActive={setIsSimulationActive} formatCurrency={fmt} />;
    if (tab === 'methodology') return <CalculationsIndexView />;
    if (tab === 'reports')     return <ReportsView data={activeData} fmt={fmt} formatCurrency={fmt} geminiKey={geminiKey} isSimulationActive={isSimulationActive} />;
    if (tab === 'ai')          return <AIView data={activeData} geminiKey={geminiKey} />;
    if (tab === 'settings')    return <SettingsView cur={cur} setCur={setCur} geminiKey={geminiKey} setGeminiKey={(k) => { setGeminiKey(k); localStorage.setItem('finanalyze_gemini_key', k); }} data={activeData} onUpdateSecteur={updateSecteur} />;

    /* ── DASHBOARD ── */
    if (!data) return (
      <div className="card fade-in" style={{ maxWidth: 480, margin: '60px auto' }}>
        <div style={{ padding: '48px 32px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 52, color:'#cbd5e1', display:'block', marginBottom: 16 }}>pie_chart</span>
          <h3 style={{ fontWeight:800, fontSize:'1.15rem', marginBottom: 8 }}>Aucune donnée importée</h3>
          <p style={{ color:'#64748b', fontSize:'0.875rem', marginBottom: 24 }}>
            Importez votre balance comptable (CSV ou Excel) pour afficher l'analyse financière.
          </p>
          <button className="btn btn-primary" onClick={() => setTab('import')}>
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>upload_file</span>
            Importer maintenant
          </button>
        </div>
      </div>
    );

    const r = activeData?.ratios || {};
    const b  = activeData?.bilan  || {};
    const s  = activeData?.sig    || {};
    const b1 = activeData?.dataN1?.bilan || {};
    const s1 = activeData?.dataN1?.sig   || {};

    const kpiTrend = (valN, valN1) => {
      if (!valN1 || valN1 === 0) return { label: '—', up: true };
      const pct = ((valN - valN1) / Math.abs(valN1)) * 100;
      return { label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, up: pct >= 0 };
    };

    const frngTrend = kpiTrend(b.frng, b1.frng);
    const bfrTrend  = kpiTrend(b.bfr,  b1.bfr);
    const tnTrend   = kpiTrend(b.tn,   b1.tn);
    const rnTrend   = kpiTrend(s.resultatNet, s1.resultatNet);

    const kpiValues = [b.frng || 0, b.bfr || 0, b.tn || 0, s.resultatNet || 0];
    const kpiMax = Math.max(...kpiValues.map(Math.abs), 1);
    const kpiPct = (v) => Math.min(100, Math.round((Math.abs(v || 0) / kpiMax) * 100));

    return (
      <div className="fade-in space-y-6">
        {/* KPI Row 1 — Équilibre Financier */}
        <div className="kpi-grid">
          {[
            { label:'FRNG', value: b.frng, color:'#2563eb', barColor:'#2563eb', pct: kpiPct(b.frng), trend: frngTrend.label, up: frngTrend.up },
            { label:'BFR',  value: b.bfr,  color:'#0f172a', barColor:'#059669', pct: kpiPct(b.bfr),  trend: bfrTrend.label,  up: bfrTrend.up  },
            { label:'Trésorerie Nette', value: b.tn, color:'#0f172a', barColor:'#d97706', pct: kpiPct(b.tn), trend: tnTrend.label, up: tnTrend.up },
            { label:'Résultat Net', value: s.resultatNet, color:'#059669', barColor:'#2563eb', pct: kpiPct(s.resultatNet), trend: rnTrend.label, up: rnTrend.up },
          ].map((k,i) => {
            const numFormatted = Math.round(k.value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            const len = numFormatted.length;
            const adaptiveFontSize = len > 14 ? '1.05rem' : len > 11 ? '1.18rem' : len > 9 ? '1.3rem' : '1.45rem';

            return (
              <div className="kpi-card" key={i} style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 6 }}>
                  <span className="kpi-label">{k.label}</span>
                  <span className={`kpi-trend ${k.up?'up':'down'}`}>
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>{k.up?'trending_up':'trending_down'}</span>
                    {k.trend}
                  </span>
                </div>
                <div className="kpi-value" style={{ color: k.color, fontSize: adaptiveFontSize, display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>{numFormatted}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0, opacity: 0.85 }}>{cur}</span>
                </div>
                <div className="kpi-bar-track">
                  <div className="kpi-bar-fill" style={{ width:`${k.pct}%`, background: k.barColor }}></div>
                </div>
                <div className="kpi-bar-labels"><span>0</span><span>{k.pct}%</span></div>
              </div>
            );
          })}
        </div>

        {/* KPI Row 2 — Rotation & Délais d'Exploitation */}
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <div 
            className="kpi-card" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} 
            onClick={() => setTab('ratios')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="kpi-label" style={{ margin: 0 }}>Rotation des Stocks</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--green)' }}>warehouse</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
                <span className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                  {r.rotationStocks ? Math.round(r.rotationStocks) : 0}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>jours</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Vitesse : <strong className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>{(r.tauxRotationStocks || 0).toFixed(1)}x / an</strong>
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Détail &rarr;</span>
            </div>
          </div>

          <div 
            className="kpi-card" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} 
            onClick={() => setTab('ratios')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="kpi-label" style={{ margin: 0 }}>Créances Clients (DSO)</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>payments</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
                <span className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                  {r.delaiRecouvrement ? Math.round(r.delaiRecouvrement) : 0}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>jours</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                Encours : <strong className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>{fmt(r.creancesClients)}</strong>
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>Détail &rarr;</span>
            </div>
          </div>

          <div 
            className="kpi-card" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} 
            onClick={() => setTab('ratios')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="kpi-label" style={{ margin: 0 }}>Dettes Fournisseurs (DPO)</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#8b5cf6' }}>receipt_long</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
                <span className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                  {r.delaiFournisseurs ? Math.round(r.delaiFournisseurs) : 0}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>jours</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                Encours : <strong className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>{fmt(r.dettesFournisseurs)}</strong>
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>Détail &rarr;</span>
            </div>
          </div>

          <div 
            className="kpi-card" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} 
            onClick={() => setTab('ratios')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="kpi-label" style={{ margin: 0 }}>BFR en Jours de CA</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--amber)' }}>timelapse</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
                <span className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                  {r.bfrJoursCA ? Math.round(r.bfrJoursCA) : 0}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>j CA</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Norme : <strong className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>&le; 60 j</strong>
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Détail &rarr;</span>
            </div>
          </div>
        </div>

        {/* Vue Annuelle : Produits (Cl. 7) vs Charges (Cl. 6) vs Résultat Net */}
        <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>bar_chart</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Vue Annuelle : Produits vs Charges</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Totaux cumulés des classes 7 et 6, et résultat net qui en découle</span>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualTotals.bars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} width={80} />
                  <Tooltip formatter={(val) => fmt(val)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                  <Bar dataKey="Montant" radius={[6, 6, 0, 0]} maxBarSize={90}>
                    {annualTotals.bars.map((entry, index) => (
                      <Cell key={`cell-annual-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, fontSize: '0.78rem' }}>
              <span>Produits : <strong className="mono" style={{ color: '#2563eb' }}>{fmt(annualTotals.totP)}</strong></span>
              <span>Charges : <strong className="mono" style={{ color: '#059669' }}>{fmt(annualTotals.totC)}</strong></span>
              <span>Résultat Net : <strong className="mono" style={{ color: annualTotals.net >= 0 ? '#059669' : '#dc2626' }}>{fmt(annualTotals.net)}</strong></span>
            </div>
          </div>
        </div>

        {/* Structure des Charges (Classe 6 — Cercle Fragmenté / Donut Chart) */}
        <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>donut_small</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Structure &amp; Répartition des Charges (Classe 6 — SCF)</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Décomposition des flux de charges par nature selon la nomenclature officielle</span>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setTab('balance')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_balance</span>
              Grand Livre des Charges
            </button>
          </div>

          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
            {/* Donut Chart (Cercle Fragmenté) avec total au centre */}
            <div style={{ position: 'relative', width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(val, name, entry) => [`${fmt(val)} (${entry.payload.pct}%)`, name]}
                  />
                  <Pie
                    data={expenses}
                    dataKey="val"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    cornerRadius={5}
                  >
                    {expenses.map((entry, index) => (
                      <Cell key={`cell-expense-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Centre du Donut avec Total des Charges */}
              <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block' }}>Total Charges</span>
                <span className="mono" style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text)', display: 'block', marginTop: 2 }}>
                  {fmt(expenses.reduce((s, e) => s + e.val, 0))}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', background: '#eff6ff', padding: '1px 6px', borderRadius: 10, display: 'inline-block', marginTop: 4 }}>
                  Classe 6
                </span>
              </div>
            </div>

            {/* Liste Détaillée des 5 Postes de Charges avec jauges et pourcentages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {expenses.map((e, i) => (
                <div key={i} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>{e.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)' }}>{fmt(e.val)}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: e.color, background: `${e.color}15`, padding: '2px 8px', borderRadius: 6, minWidth: 42, textAlign: 'center' }}>
                        {e.pct}%
                      </span>
                    </div>
                  </div>
                  {/* Micro barre de progression */}
                  <div style={{ height: 4, width: '100%', background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${e.pct}%`, background: e.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Évolution des Stocks par Catégorie (Nouveau cadre Vue d'ensemble) */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span className="material-symbols-outlined" style={{ fontSize:22, color:'var(--primary)' }}>warehouse</span>
              <div>
                <h3 style={{ margin:0, fontSize:'0.92rem', fontWeight:800 }}>Évolution des Stocks par Catégorie</h3>
                <span style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>Comparaison des stocks initiaux (N-1) et finaux (N) selon la nomenclature SCF</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span className={`badge ${stockData.globalMouvement === 'STOCKAGE' ? 'badge-green' : stockData.globalMouvement === 'DÉSTOCKAGE' ? 'badge-red' : 'badge-blue'}`}>
                <span className="material-symbols-outlined" style={{ fontSize:13 }}>
                  {stockData.globalMouvement === 'STOCKAGE' ? 'trending_up' : stockData.globalMouvement === 'DÉSTOCKAGE' ? 'trending_down' : 'remove'}
                </span>
                {stockData.globalMouvement} ({stockData.totalVariation > 0 ? `+${fmt(stockData.totalVariation)}` : fmt(stockData.totalVariation)} | {fmtPct(stockData.totalPctVariation)})
              </span>
              <button className="btn btn-ghost" style={{ fontSize:'0.75rem', padding:'5px 12px' }} onClick={() => setTab('stocks')}>
                Analyse Détaillée
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Graphique à barres comparatif initial vs final */}
            <div style={{ height: 230, marginBottom: 20 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stockData.categories.map(c => ({
                    name: c.code + ' ' + (c.label.split('—')[1]?.trim()?.split(' ')[0] || c.label),
                    'Stock Initial': c.stockInitial,
                    'Stock Final': c.stockFinal,
                  }))} 
                  margin={{ top:10, right:10, left:-15, bottom:5 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(v, n) => [fmt(v), n]}
                  />
                  <Bar dataKey="Stock Initial" fill="#94a3b8" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Stock Final" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cartes par catégorie de stock */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12 }}>
              {stockData.categories.map((cat, i) => (
                <div key={i} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, gap:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--primary)', flexShrink:0 }}>{cat.icon || 'inventory_2'}</span>
                      <span style={{ fontWeight:700, fontSize:'0.8rem', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cat.label}</span>
                    </div>
                    <span className={`badge ${cat.badgeCls}`} style={{ fontSize:'0.6rem', flexShrink:0 }}>{cat.mouvement}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:4 }}>
                    <span style={{ color:'var(--text-muted)' }}>Début: <strong style={{ color:'var(--text)' }}>{fmt(cat.stockInitial)}</strong></span>
                    <span style={{ color:'var(--text-muted)' }}>Fin: <strong style={{ color:'var(--text)' }}>{fmt(cat.stockFinal)}</strong></span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:6, borderTop:'1px dashed #cbd5e1', marginTop:4 }}>
                    <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:600 }}>Variation Net:</span>
                    <span className="mono" style={{ fontWeight:800, fontSize:'0.82rem', color: cat.variation > 0 ? 'var(--green)' : cat.variation < 0 ? 'var(--red)' : 'var(--text)' }}>
                      {cat.variation > 0 ? `+${fmt(cat.variation)}` : fmt(cat.variation)}
                      <span style={{ fontSize:'0.72rem', marginLeft:4, opacity:0.9 }}>
                        ({fmtPct(cat.pctVariation)})
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notable Table — Alertes Soldes Anormaux */}
        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-header">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="material-symbols-outlined" style={{ fontSize:20, color:'var(--red)' }}>warning</span>
              <h3>Alertes — Soldes Anormaux</h3>
            </div>
            <button className="btn btn-ghost" style={{ fontSize:'0.75rem', padding:'5px 12px' }} onClick={() => setTab('balance')}>
              Balance complète
            </button>
          </div>
          {notableRows.filter(r => r.anomalie !== false).length === 0 ? (
            <div style={{ padding:'28px', textAlign:'center', color:'var(--green)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <span className="material-symbols-outlined" style={{ fontSize:36 }}>check_circle</span>
              <span style={{ fontWeight:700, fontSize:'0.875rem' }}>Aucun solde anormal détecté</span>
              <span style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>Tous les comptes ont un solde conforme aux règles du PCG.</span>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>COMPTE</th>
                    <th>INTITULÉ</th>
                    <th className="right">SOLDE DÉB.</th>
                    <th className="right">SOLDE CRÉ.</th>
                    <th>ANOMALIE</th>
                    <th>MOTIF</th>
                  </tr>
                </thead>
                <tbody>
                  {notableRows.map((r, i) => (
                    <tr key={i}>
                      <td><span className="mono" style={{ fontWeight:700, color:'var(--primary-dk)' }}>{r.compte}</span></td>
                      <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.libelle}</td>
                      <td className="right">{(r.soldeFinDebit || 0) > 0.01 ? fmt(r.soldeFinDebit) : <span style={{color:'var(--text-sub)'}}>—</span>}</td>
                      <td className="right">{(r.soldeFinCredit || 0) > 0.01 ? fmt(r.soldeFinCredit) : <span style={{color:'var(--text-sub)'}}>—</span>}</td>
                      <td style={{ minWidth:140 }}>
                        <span className={`badge ${r.cls}`}>
                          <span className="material-symbols-outlined" style={{ fontSize:10 }}>
                            {r.cls === 'badge-red' ? 'error' : r.cls === 'badge-amber' ? 'warning' : 'check_circle'}
                          </span>
                          {r.sens}
                        </span>
                      </td>
                      <td style={{ fontSize:'0.75rem', color:'var(--text-muted)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.motif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '18px 18px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             {/* BAIQ Logo Mark */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#000000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                border: '1px solid #27272a'
              }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '0.92rem', color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>BQ</span>
              </div>
              {/* Blue dot — top-right */}
              <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 9, height: 9, borderRadius: '50%',
                background: '#2563eb',
                border: '2px solid var(--surface)',
                boxShadow: '0 0 6px rgba(37,99,235,0.7)',
                display: 'block'
              }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.06em', lineHeight: 1 }}>BAIQ</span>
              </div>
              <div style={{ fontSize: '0.52rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginTop: 2, lineHeight: 1 }}>Balance and Financial Analytics</div>
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-sub)', letterSpacing: '0.06em', opacity: 0.7 }}>Comptabilité · Finance · IA — SCF Algérie</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => {
            const isAI = n.id === 'ai';
            const isActive = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={isAI ? {
                  background: isActive
                    ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                    : 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
                  color: isActive ? '#fff' : '#7c3aed',
                  border: '1px solid #c4b5fd',
                  marginTop: 8,
                  fontWeight: 800,
                } : {}}
              >
                <span className="material-symbols-outlined" style={isAI && !isActive ? { color: '#7c3aed' } : {}}>{n.icon}</span>
                {n.label}
                {isAI && !isActive && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.55rem', fontWeight: 900, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>IA</span>
                )}
              </button>
            );
          })}
        </nav>
        {/* COMPTEUR D'ANALYSES EXÉCUTÉES (100% Confidentiel - Simple entier local) */}
        <div style={{ padding: '8px 12px', margin: '4px 10px 8px 10px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>analytics</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>Analyses exécutées</span>
          </div>
          <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)', background: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: 6 }}>
            {analysisCount}
          </span>
        </div>
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          <button className={`nav-item ${tab==='settings'?'active':''}`} onClick={() => setTab('settings')}>
            <span className="material-symbols-outlined">settings</span>
            Paramètres
          </button>
          <button 
            className="nav-item" 
            onClick={() => setShowContactModal(true)}
            style={{ color: 'var(--primary)', fontWeight: 800, background: 'rgba(37, 99, 235, 0.06)', borderRadius: 8 }}
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>support_agent</span>
            Contact
          </button>
        </div>
      </aside>

      {/* ── MAIN ZONE ── */}
      <div className="main-zone">
        <header className="top-header">
          <div className="header-left">
            <span className="material-symbols-outlined">analytics</span>
            <span className="header-title">{screenTitle}</span>
          </div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Interrupteur Mode Simulation Global (Visible sur tous les écrans) */}
            <button
              onClick={() => {
                if (simulationEntries.length === 0 && !isSimulationActive) {
                  setTab('whatif');
                } else {
                  setIsSimulationActive(!isSimulationActive);
                }
              }}
              title="Activer/Désactiver le Mode Simulation ou Gérer les Écritures"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                background: isSimulationActive ? 'linear-gradient(135deg, #059669, #047857)' : 'var(--surface-alt)',
                color: isSimulationActive ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${isSimulationActive ? '#059669' : 'var(--border)'}`,
                fontSize: '0.78rem', fontWeight: 800, transition: 'all 0.2s',
                boxShadow: isSimulationActive ? '0 2px 8px rgba(5,150,105,0.25)' : 'none'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {isSimulationActive ? 'edit_note' : 'do_not_disturb_on'}
              </span>
              {isSimulationActive ? `Mode Simulé (${simulationEntries.length}) 📝` : 'Mode Réel 🔵'}
            </button>

            {data && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, padding: '4px 12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#2563eb' }}>domain</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Secteur :</span>
                <select
                  value={data?.profil?.secteurId || 'commerce_gros'}
                  onChange={e => updateSecteur(e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', outline: 'none', cursor: 'pointer' }}
                >
                  {SECTEURS.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.label}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface-alt)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--text)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            <div className="avatar" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', border: '2px solid #93c5fd' }}>
              <span className="avatar-initials" style={{ color: '#fff', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '-0.02em' }}>IB</span>
            </div>
          </div>
        </header>

        <main className="canvas">
          {isSimulationActive && simulationEntries.length > 0 && tab !== 'whatif' && (
            <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', padding: '10px 18px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit_note</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  MODE SIMULATION ACTIF 📝 : {simulationEntries.length} écriture(s) en partie double appliquée(s) à toute l'application.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={() => setTab('whatif')} style={{ background: '#fff', color: '#047857', border: 'none', padding: '4px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>
                  Gérer la Simulation ⚙️
                </button>
                <button onClick={() => setIsSimulationActive(false)} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  Désactiver ✕
                </button>
              </div>
            </div>
          )}
          {renderContent()}
        </main>
      </div>

      {/* ── MOBILE NAV ── */}
      <nav className="mobile-nav">
        {NAV.slice(0,5).map(n => (
          <button key={n.id} className={`mobile-nav-item ${tab===n.id?'active':''}`} onClick={() => setTab(n.id)}>
            <span className="material-symbols-outlined">{n.icon}</span>
            <span>{n.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* ── MODALE DE CONTACT & ASSISTANCE ── */}
      {showContactModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 500, background: 'var(--surface)', borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden', border: '1px solid var(--border)'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#60a5fa' }}>support_agent</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Contact &amp; Assistance</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>BAIQ — Balance and Financial Analytics</p>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', padding: 6, cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--surface-alt)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Plateforme &amp; Support Technique</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>Assistance Comptable &amp; Financière SCF</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Besoin d'une démonstration, d'une règle d'audit spécifique ou d'un support technique ?</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a
                  href="mailto:contact@baiq.ai"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                    textDecoration: 'none', color: 'var(--text)', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: 22 }}>mail</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>EMAIL CONTACT</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>contact@baiq.ai</div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>arrow_forward</span>
                </a>

                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 22 }}>verified</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>EXPÉRIENCE &amp; R&amp;D</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Moteur d'Audit &amp; IA SCF Algérie</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#ecfdf5', color: '#059669' }}>v2.5</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', borderRadius: 10, fontWeight: 800 }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PALETTE DE COMMANDES (Ctrl+K) ── */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(id) => setTab(id)}
        rows={activeData?.rows}
        data={activeData}
        onExportExcel={() => exportFinancialWorkbook(activeData)}
        onExportPDF={() => generateFullPDF(activeData, undefined, isSimulationActive)}
        onTogglePresentation={() => setIsPresentationOpen(true)}
        isSimulationActive={isSimulationActive}
        setIsSimulationActive={setIsSimulationActive}
      />

      {/* ── MODE PRÉSENTATION DAF (Plein Écran) ── */}
      {isPresentationOpen && (
        <PresentationView
          data={activeData}
          onClose={() => setIsPresentationOpen(false)}
          formatCurrency={fmt}
        />
      )}
    </div>
  );
}

/* ── ReportsView est dans ./components/ReportsView.jsx ── */

function SettingsView({ cur, setCur, geminiKey, setGeminiKey, data, onUpdateSecteur }) {
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [serverProxyConfigured, setServerProxyConfigured] = useState(null); // null = vérification en cours

  useEffect(() => {
    let cancelled = false;
    fetch('/api/gemini/status')
      .then(res => (res.ok ? res.json() : { configured: false }))
      .then(json => { if (!cancelled) setServerProxyConfigured(Boolean(json?.configured)); })
      .catch(() => { if (!cancelled) setServerProxyConfigured(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSaveKey = () => {
    setGeminiKey(geminiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <div>
        <div className="section-title">Paramètres</div>
        <div className="section-sub">Configuration de l'affichage et de l'IA.</div>
      </div>

      {/* Devise */}
      <div className="card" style={{ maxWidth: 500 }}>
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>payments</span>
            Symbole monétaire affiché
          </h3>
        </div>
        <div className="card-body">
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Libellé affiché après les montants</label>
          <input
            value={cur}
            onChange={e => setCur(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706', flexShrink: 0 }}>info</span>
            <p style={{ fontSize: '0.72rem', color: '#92400e', margin: 0 }}>
              Ce champ ne fait que <strong>changer le libellé</strong> affiché après les montants (ex: "DZD" au lieu de "DA") — aucune conversion
              de change n'est effectuée. Les montants restent exprimés dans la devise réelle de votre balance importée, quel que soit le texte saisi ici.
            </p>
          </div>
        </div>
      </div>

      {/* Secteur d'activité */}
      {data && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>domain</span>
              Secteur d'activité (Benchmarks)
            </h3>
          </div>
          <div className="card-body">
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Référentiel sectoriel actif</label>
            <select
              value={data?.profil?.secteurId || 'commerce_gros'}
              onChange={e => onUpdateSecteur(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.88rem', fontWeight: 700, outline: 'none', background: '#fff' }}
            >
              {SECTEURS.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>
              Changer le secteur recalibre immédiatement toutes les normes sectorielles et scores IA sans réimporter la balance.
            </p>
          </div>
        </div>
      )}

      {/* Gemini API Key */}
      <div className="card" style={{ maxWidth: 500, border: '1px solid #c4b5fd' }}>
        <div className="card-header" style={{ background: '#f5f3ff', borderBottom: '1px solid #ddd6fe' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#fff' }}>smart_toy</span>
            </span>
            Clé API Google Gemini
          </h3>
          <span className="badge" style={{ background: '#ede9fe', color: '#7c3aed', borderColor: '#c4b5fd' }}>IA Avancée</span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Statut du relais serveur sécurisé */}
          {serverProxyConfigured === true ? (
            <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#059669' }}>verified_user</span>
              <span><strong>Relais serveur sécurisé actif.</strong> L'IA Gemini fonctionne sans qu'aucune clé ne transite par votre navigateur — la clé ci-dessous n'est pas nécessaire.</span>
            </div>
          ) : serverProxyConfigured === false ? (
            <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.6 }}>
              <strong>🤖 Comment obtenir une clé Gemini gratuitement :</strong><br />
              1. Allez sur <strong>aistudio.google.com</strong><br />
              2. Connectez-vous avec votre compte Google<br />
              3. Cliquez sur <strong>"Get API Key"</strong> → <strong>"Create API Key"</strong><br />
              4. Copiez la clé et collez-la ci-dessous
            </div>
          ) : (
            <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
              Vérification du relais serveur en cours…
            </div>
          )}

          {/* Confidentialité : les données sont envoyées à Google, quel que soit le mode */}
          <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.74rem', color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>privacy_tip</span>
            <span>
              <strong>Confidentialité :</strong> lorsque l'Assistant IA ou les rapports Gemini sont utilisés, les données financières du dossier actif
              (chiffres du bilan, du compte de résultat, ratios) sont transmises à l'API Google Gemini pour générer l'analyse. N'activez pas cette
              fonctionnalité sur des dossiers confidentiels sans l'accord de votre client. Le reste de l'application (calculs, ratios, PDF/Excel) fonctionne
              entièrement en local, sans aucun envoi de données.
            </span>
          </div>

          <div style={{ opacity: serverProxyConfigured ? 0.5 : 1, pointerEvents: serverProxyConfigured ? 'none' : 'auto' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Clé API Gemini {serverProxyConfigured ? '(non nécessaire — relais serveur actif)' : '(mode local de repli)'}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid #c4b5fd', borderRadius: 9, fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace', outline: 'none', background: '#faf5ff' }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showKey ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                style={{ padding: '10px 18px', background: saved ? '#059669' : 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.3s', whiteSpace: 'nowrap' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{saved ? 'check_circle' : 'save'}</span>
                {saved ? 'Sauvegardé !' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {geminiKey && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#059669' }}>check_circle</span>
              Clé configurée — utilisée uniquement si le relais serveur sécurisé n'est pas disponible.
            </div>
          )}

          <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.5, marginTop: 10 }}>
            🔒 Cette clé, si renseignée, est stockée uniquement dans votre navigateur (localStorage) et n'est envoyée qu'à Google, jamais à nos serveurs.
            Sur un poste partagé, préférez le relais serveur (ci-dessus) qui évite de stocker une clé côté client.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
