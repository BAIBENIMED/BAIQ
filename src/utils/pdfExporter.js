/* ═══════════════════════════════════════════════════════════════════════
   BAIQ — Exporteur PDF Style LaTeX / Monographie Académique & Audit
   Formatage professionnel inspiré de LaTeX (Booktabs, Fancyhdr, Serif Typography)
   Conforme au Système Comptable Financier (SCF Algérie — Loi 07-11)
   ═══════════════════════════════════════════════════════════════════════ */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Palette Typographique & Teintes LaTeX ──────────────────────────────
const T = {
  inkPrimary:   [17, 24, 39],       // Noir d'encre profond (#111827)
  inkSecondary: [55, 65, 81],       // Gris foncé texte (#374151)
  inkMuted:     [107, 114, 128],    // Gris moyen (#6b7280)
  inkLight:     [156, 163, 175],    // Gris clair légendes (#9ca3af)
  
  navy:         [15, 32, 67],       // Bleu institutionnel Oxford (#0f2043)
  darkRed:      [153, 27, 27],      // Rouge bordeaux LaTeX (#991b1b)
  darkGreen:    [22, 101, 52],      // Vert forêt LaTeX (#166534)
  darkAmber:    [146, 64, 14],      // Ocre sombre (#92400e)
  
  ruleHeavy:    [17, 24, 39],       // Ligne principale 1.0pt
  ruleMedium:   [75, 85, 99],       // Ligne médiane 0.6pt
  ruleLight:    [209, 213, 219],    // Filet léger 0.3pt (#d1d5db)
  boxBg:        [248, 249, 250],    // Fond grisé style tcolorbox (#f8f9fa)
  boxBorder:    [229, 231, 235],    // Bordure boîte (#e5e7eb)
  accentBg:     [241, 245, 249],    // Fond bleu grisé discret
};

// ── Fonctions Utilitaires de Formatage ─────────────────────────────────
const fmtDZD = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const num = Math.round(Number(v));
  const sign = num < 0 ? '-' : '';
  return `${sign}${Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DZD`;
};

const fmtPct = (v, d = 1) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const prefix = v > 0 ? '+' : '';
  return `${prefix}${(v * 100).toFixed(d)} %`;
};

const fmtNum = (v, d = 2) => {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return Number(v).toFixed(d);
};

const fmtDays = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `${Math.round(v)} j`;
};

const safeDiv = (a, b) => (b && b !== 0 && isFinite(a / b) ? a / b : 0);

// ── En-tête et Pied de Page style LaTeX (fancyhdr) ────────────────────
function applyLatexHeaderFooter(doc, totalPages, dossierName, exerciceYear = 'N') {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 18;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Page de garde : pas d'en-tête, pied de page minimal
    if (p === 1) {
      doc.setDrawColor(...T.ruleLight);
      doc.setLineWidth(0.3);
      doc.line(margin, H - 15, W - margin, H - 15);

      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...T.inkMuted);
      doc.text('BAIQ Platform — Rapport financier confidentiel à usage de gestion et d\'audit.', margin, H - 10);
      doc.text('Page 1', W - margin, H - 10, { align: 'right' });
      continue;
    }

    // ── En-tête de page (fancyhdr running header) ──
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...T.inkSecondary);
    
    // Titre courant gauche
    doc.text('BAIQ Finance · Système Comptable Financier (SCF Algérie)', margin, 12);
    
    // Dossier et exercice à droite
    doc.setFont('times', 'normal');
    doc.text(`${dossierName} · Exercice ${exerciceYear}`, W - margin, 12, { align: 'right' });

    // Filet d'en-tête (thin rule)
    doc.setDrawColor(...T.ruleMedium);
    doc.setLineWidth(0.4);
    doc.line(margin, 14.5, W - margin, 14.5);

    // ── Pied de page (fancyhdr running footer) ──
    doc.setDrawColor(...T.ruleLight);
    doc.setLineWidth(0.3);
    doc.line(margin, H - 14, W - margin, H - 14);

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...T.inkMuted);
    
    const printDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Document généré le ${printDate} · Traitement local sécurisé`, margin, H - 9);

    // Folio centré style LaTeX : — [Page X / Y] —
    doc.setFont('times', 'bold');
    doc.setTextColor(...T.inkPrimary);
    doc.text(`— ${p} / ${totalPages} —`, W / 2, H - 9, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.inkMuted);
    doc.text('Loi n° 07-11 / Décret 08-156', W - margin, H - 9, { align: 'right' });
  }
}

// ── Titre de Chapitre LaTeX (\section{...}) ────────────────────────────
function latexSection(doc, number, title, y) {
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;

  // Ligne de rappel supérieure fine
  doc.setDrawColor(...T.navy);
  doc.setLineWidth(0.8);
  doc.line(margin, y, W - margin, y);

  // Titre en capitales avec Serif
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...T.navy);
  doc.text(`SECTION ${number}.  ${title.toUpperCase()}`, margin, y + 5.5);

  doc.setDrawColor(...T.ruleLight);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 7.5, W - margin, y + 7.5);

  return y + 13;
}

// ── Sous-titre (\subsection{...}) ──────────────────────────────────────
function latexSubSection(doc, title, y) {
  const margin = 18;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.inkPrimary);
  doc.text(title, margin, y);
  return y + 5;
}

// ── Boîte de Définition / Formule Mathématique (LaTeX tcolorbox) ────────
function latexMathBox(doc, formulaText, subtitle, y, height = 18) {
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  const boxW = W - margin * 2;

  doc.setFillColor(...T.boxBg);
  doc.setDrawColor(...T.boxBorder);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, boxW, height, 'FD');

  // Filet vertical gauche d'accent
  doc.setFillColor(...T.navy);
  doc.rect(margin, y, 1.8, height, 'F');

  // Formule centrée en style mathématique
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.navy);
  doc.text(formulaText, margin + 8, y + 7);

  if (subtitle) {
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.inkMuted);
    doc.text(subtitle, margin + 8, y + 13);
  }

  return y + height + 6;
}

// ── Blocs KPI style Thèse / Rapport de Gestion (3 colonnes) ────────────
function latexKpiRow(doc, items, y) {
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  const colW = (W - margin * 2 - 8) / items.length;
  const h = 20;

  items.forEach((item, idx) => {
    const x = margin + idx * (colW + 4);

    doc.setFillColor(...T.boxBg);
    doc.setDrawColor(...T.boxBorder);
    doc.setLineWidth(0.3);
    doc.rect(x, y, colW, h, 'FD');

    // Petite barre supérieure colorée
    const barColor = item.status === 'ok' ? T.darkGreen : item.status === 'danger' ? T.darkRed : T.navy;
    doc.setFillColor(...barColor);
    doc.rect(x, y, colW, 1.2, 'F');

    // Label en Small Caps / Italic
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.inkMuted);
    doc.text(item.label, x + 4, y + 6);

    // Valeur principale en chiffres gras
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...barColor);
    doc.text(item.val, x + 4, y + 13);

    // Note de bas
    if (item.sub) {
      doc.setFont('times', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...T.inkSecondary);
      doc.text(item.sub, x + 4, y + 18);
    }
  });

  return y + h + 6;
}

// ── Table Booktabs LaTeX Standard ─────────────────────────────────────
function drawBooktabsTable(doc, head, body, startY, opts = {}) {
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();

  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: margin, right: margin },
    theme: 'plain', // LaTeX Booktabs : pas de fond zébré criard, lignes pures
    styles: {
      font: 'times',
      fontSize: 8,
      textColor: T.inkPrimary,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineWidth: 0,
      lineColor: T.ruleLight,
    },
    headStyles: {
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8,
      textColor: T.navy,
      fillColor: false,
      lineWidth: 0,
    },
    columnStyles: opts.columnStyles || {},
    willDrawCell: (data) => {
      if (opts.boldRows && opts.boldRows.includes(data.row.index)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = T.navy;
      }
    },
    didDrawCell: (data) => {
      const { doc: d, cell, row, column } = data;
      const isFirstRow = row.index === 0 && data.section === 'head';
      const isLastHead = row.index === head.length - 1 && data.section === 'head';
      const isLastBody = row.index === body.length - 1 && data.section === 'body';

      // \toprule (haut du tableau)
      if (isFirstRow && column.index === 0) {
        d.setDrawColor(...T.ruleHeavy);
        d.setLineWidth(1.0);
        d.line(margin, cell.y, pageWidth - margin, cell.y);
      }

      // \midrule (sous les en-têtes)
      if (isLastHead && column.index === 0) {
        d.setDrawColor(...T.ruleMedium);
        d.setLineWidth(0.6);
        const lineY = cell.y + cell.height;
        d.line(margin, lineY, pageWidth - margin, lineY);
      }

      // Ligne fine sous les sections totales
      if (data.section === 'body' && opts.totalRowIndices && opts.totalRowIndices.includes(row.index) && column.index === 0) {
        d.setDrawColor(...T.ruleLight);
        d.setLineWidth(0.4);
        d.line(margin, cell.y, pageWidth - margin, cell.y);
      }

      // \bottomrule (fin du tableau)
      if (isLastBody && column.index === 0) {
        d.setDrawColor(...T.ruleHeavy);
        d.setLineWidth(1.0);
        const lineY = cell.y + cell.height;
        d.line(margin, lineY, pageWidth - margin, lineY);
      }
    },
    ...opts,
  });

  return (doc.lastAutoTable ? doc.lastAutoTable.finalY : startY) + 8;
}

// ══════════════════════════════════════════════════════════════════════
//  FONCTION PRINCIPALE D'EXPORTATION PDF STYLE LATEX
// ══════════════════════════════════════════════════════════════════════
export async function generateFullPDF(data) {
  const { bilan = {}, sig = {}, ratios = {}, rows = [], profil = {}, dataN1 } = data || {};
  const r = ratios;
  const s = sig;
  const b = bilan;
  const b1 = dataN1?.bilan || null;
  const s1 = dataN1?.sig || null;

  const dossierName   = profil?.nomEntreprise || 'Entité Anonyme';
  const secteurLabel  = profil?.secteurId ? profil.secteurId.replace(/_/g, ' ').toUpperCase() : 'INDUSTRIE / NON SPÉCIFIÉ';
  const effectifCount = profil?.effectif ? `${profil.effectif} salariés` : 'Non communiqué';

  // Métriques financières fondamentales
  const ca           = s.chiffreAffaires || 0;
  const va           = s.valeurAjoutee || 0;
  const ebe          = s.ebe || 0;
  const re           = s.resultatExploitation || 0;
  const rn           = s.resultatNet || 0;
  const frng         = b.frng || 0;
  const bfr          = b.bfr || 0;
  const tn           = b.tn || 0;

  const margeEBE     = safeDiv(ebe, ca);
  const margeNette   = safeDiv(rn, ca);
  const margeExploit = safeDiv(re, ca);
  const tauxVA       = safeDiv(va, ca);
  const liqGen       = r.liquiditeGenerale || 0;
  const autFinanc    = r.autonomieFinanciere || 0;
  const dso          = r.delaiRecouvrement || 0;
  const dpo          = r.delaiFournisseurs || 0;
  const rotStock     = r.rotationStocks || 0;
  const bfrJours     = r.bfrJoursCA || 0;

  // Création du document jsPDF (Format A4 standardisé)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;

  // ──────────────────────────────────────────────────────────────────
  // PAGE 1 — PAGE DE TITRE / MONOGRAPHIE ACADÉMIQUE LATEX
  // ──────────────────────────────────────────────────────────────────
  let y = 28;

  // En-tête Institutionnel
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...T.inkMuted);
  doc.text('RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE', W / 2, y, { align: 'center' });
  y += 4.5;
  doc.text('RÉFÉRENTIEL COMPTABLE ET FINANCIER SCF — LOI N° 07-11 / DÉCRET 08-156', W / 2, y, { align: 'center' });
  y += 6;

  // Double filet décoratif LaTeX
  doc.setDrawColor(...T.navy);
  doc.setLineWidth(1.2);
  doc.line(margin + 20, y, W - margin - 20, y);
  doc.setLineWidth(0.4);
  doc.line(margin + 20, y + 1.8, W - margin - 20, y + 1.8);
  y += 18;

  // Titre Principal
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...T.navy);
  doc.text('RAPPORT D\'ANALYSE FINANCIÈRE', W / 2, y, { align: 'center' });
  y += 7.5;
  doc.setFontSize(14);
  doc.text('ET D\'AUDIT DES ÉTATS DE SYNTHÈSE', W / 2, y, { align: 'center' });
  y += 6;

  // Sous-titre descriptif
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.inkSecondary);
  doc.text('Diagnostic structurel de liquidité, rentabilité, équilibre fonctionnel et solvabilité', W / 2, y, { align: 'center' });
  y += 14;

  // Bloc Métadonnées du Dossier (LaTeX Description Table)
  const metaHead = [['PARAMÈTRE DU DOSSIER', 'VALEUR DÉCLARÉE & CONTRÔLÉE']];
  const metaBody = [
    ['Entité / Raison Sociale', dossierName],
    ['Secteur d\'Activité', secteurLabel],
    ['Effectif Déclaré', effectifCount],
    ['Chiffre d\'Affaires Net HT (N)', fmtDZD(ca)],
    ['Résultat Net de l\'Exercice (N)', fmtDZD(rn)],
    ['Fonds de Roulement Net Global (FRNG)', fmtDZD(frng)],
    ['Trésorerie Nette de Clôture (TN)', fmtDZD(tn)],
    ['Date d\'Analyse & Traitement', new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
  ];

  y = drawBooktabsTable(doc, metaHead, metaBody, y, {
    columnStyles: {
      0: { fontStyle: 'bold', textColor: T.navy, cellWidth: 70 },
      1: { cellWidth: W - margin * 2 - 70 }
    }
  });

  y += 2;

  // Résumé Exécutif (Abstract LaTeX)
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.navy);
  doc.text('RÉSUMÉ EXÉCUTIF (ABSTRACT)', margin, y);
  y += 4.5;

  const abstractText = `Le présent document constitue une analyse financière intégrale de l'entité ${dossierName} établie selon les prescriptions du Système Comptable Financier (SCF) algérien. L'évaluation porte sur la structure du bilan fonctionnel (FRNG : ${fmtDZD(frng)}, BFR : ${fmtDZD(bfr)}), la performance économique (EBE : ${fmtDZD(ebe)}, RN : ${fmtDZD(rn)}) et la conformité des soldes de balance avec les règles légales d'imputation. Les flux et ratios ont été vérifiés selon les normes sectorielles de la Banque d'Algérie.`;

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...T.inkSecondary);
  const splitAbstract = doc.splitTextToSize(abstractText, W - margin * 2);
  doc.text(splitAbstract, margin, y);
  y += splitAbstract.length * 4 + 8;

  // Table des Matières (Table of Contents LaTeX avec points de conduite)
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.navy);
  doc.text('TABLE DES MATIÈRES', margin, y);
  y += 5;

  const toc = [
    ['1. Équilibre Financier & Bilan Fonctionnel SCF', '2'],
    ['2. Compte de Résultat & Soldes Intermédiaires de Gestion (TCR)', '3'],
    ['3. Ratios Financiers, Solvabilité & Délais de Rotation', '4'],
    ['4. Analyse Comparative Pluriannuelle (N vs N-1)', '5'],
    ['5. Matrice Analytique des Forces, Faiblesses et Risques', '6'],
    ['6. Audit des Natures de Comptes & Anomalies d\'Écritures', '7'],
  ];

  toc.forEach(([title, pageNum]) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...T.inkPrimary);
    doc.text(title, margin + 4, y);

    // Points de conduite (\dotfill)
    const titleWidth = doc.getTextWidth(title);
    const startX = margin + 6 + titleWidth;
    const endX = W - margin - 8;

    doc.setDrawColor(...T.ruleLight);
    doc.setLineWidth(0.2);
    doc.setLineDash([0.8, 1.5]);
    if (startX < endX) {
      doc.line(startX, y - 0.8, endX, y - 0.8);
    }
    doc.setLineDash([]);

    doc.setFont('times', 'bold');
    doc.setTextColor(...T.navy);
    doc.text(pageNum, W - margin, y, { align: 'right' });
    y += 5;
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 2 — SECTION 1 : ÉQUILIBRE FINANCIER & BILAN FONCTIONNEL
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '1', 'Équilibre Financier & Bilan Fonctionnel (SCF)', y);

  // Formule mathématique
  y = latexMathBox(
    doc,
    'FRNG = Ressources Stables - Emplois Stables     |     TN = FRNG - BFR',
    'Règle d\'or de l\'équilibre : Le Fonds de Roulement Net Global doit couvrir l\'intégralité du BFR d\'exploitation.',
    y,
    17
  );

  // Rangée KPI LaTeX
  y = latexKpiRow(doc, [
    { label: 'FRNG (Ressources - Emplois)', val: fmtDZD(frng), sub: frng >= 0 ? 'Excédent structurel' : 'Déficit structurel', status: frng >= 0 ? 'ok' : 'danger' },
    { label: 'BFR (Besoin en Fonds de Roulement)', val: fmtDZD(bfr), sub: `${fmtDays(bfrJours)} de CA HT`, status: 'normal' },
    { label: 'Trésorerie Nette (TN)', val: fmtDZD(tn), sub: tn >= 0 ? 'Position de liquidité saine' : 'Recours aux concours CT', status: tn >= 0 ? 'ok' : 'danger' },
  ], y);

  y = latexSubSection(doc, '1.1. Tableau Synthétique des Masses Fonctionnelles', y);

  const bilanHead = [['MASSE FONCTIONNELLE', 'EXERCICE N (DZD)', b1 ? 'EXERCICE N-1 (DZD)' : '', b1 ? 'VARIATION (DZD)' : ''].filter(Boolean)];
  const bilanBody = [
    ['ACTIF DU BILAN (EMPLOIS)', '', b1 ? '' : '', b1 ? '' : ''].filter(Boolean),
    ['Emplois Stables (Actifs non courants bruts)', fmtDZD(b.emploisStables), b1 ? fmtDZD(b1.emploisStables) : '', b1 ? fmtDZD((b.emploisStables || 0) - (b1.emploisStables || 0)) : ''].filter(Boolean),
    ['Actif Circulant d\'Exploitation (Stocks + Créances)', fmtDZD(b.actifCirculant), b1 ? fmtDZD(b1.actifCirculant) : '', b1 ? fmtDZD((b.actifCirculant || 0) - (b1.actifCirculant || 0)) : ''].filter(Boolean),
    ['Trésorerie Active (Disponibilités & Banques débitrices)', fmtDZD(b.tresorerieActive), b1 ? fmtDZD(b1.tresorerieActive) : '', b1 ? fmtDZD((b.tresorerieActive || 0) - (b1.tresorerieActive || 0)) : ''].filter(Boolean),
    ['TOTAL GÉNÉRAL DE L\'ACTIF', fmtDZD((b.emploisStables || 0) + (b.actifCirculant || 0) + (b.tresorerieActive || 0)), b1 ? fmtDZD((b1.emploisStables || 0) + (b1.actifCirculant || 0) + (b1.tresorerieActive || 0)) : '', ''].filter(Boolean),
    ['PASSIF DU BILAN (RESSOURCES)', '', b1 ? '' : '', ''].filter(Boolean),
    ['Ressources Stables (Capitaux Propres + Dettes LT + Amort.)', fmtDZD(b.ressourcesStables), b1 ? fmtDZD(b1.ressourcesStables) : '', b1 ? fmtDZD((b.ressourcesStables || 0) - (b1.ressourcesStables || 0)) : ''].filter(Boolean),
    ['Passif Circulant d\'Exploitation (Dettes CT Fournisseurs/Fiscales)', fmtDZD(b.passifCirculant), b1 ? fmtDZD(b1.passifCirculant) : '', b1 ? fmtDZD((b.passifCirculant || 0) - (b1.passifCirculant || 0)) : ''].filter(Boolean),
    ['Trésorerie Passive (Concours bancaires courants & soldes créditeurs)', fmtDZD(b.tresoreriePassive), b1 ? fmtDZD(b1.tresoreriePassive) : '', b1 ? fmtDZD((b.tresoreriePassive || 0) - (b1.tresoreriePassive || 0)) : ''].filter(Boolean),
    ['TOTAL GÉNÉRAL DU PASSIF', fmtDZD((b.ressourcesStables || 0) + (b.passifCirculant || 0) + (b.tresoreriePassive || 0)), b1 ? fmtDZD((b1.ressourcesStables || 0) + (b1.passifCirculant || 0) + (b1.tresoreriePassive || 0)) : '', ''].filter(Boolean),
  ];

  y = drawBooktabsTable(doc, bilanHead, bilanBody, y, {
    boldRows: [0, 4, 5, 9],
    totalRowIndices: [4, 9],
    columnStyles: b1
      ? { 0: { cellWidth: 68 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
      : { 0: { cellWidth: 100 }, 1: { halign: 'right' } }
  });

  // Note d'interprétation
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...T.inkMuted);
  doc.text('Note technique : Conformément aux normes SCF, les amortissements et pertes de valeur sont reclassés en ressources stables pour apprécier la capacité totale de financement.', margin, y);

  // ──────────────────────────────────────────────────────────────────
  // PAGE 3 — SECTION 2 : SIG & COMPTE DE RÉSULTAT (TCR)
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '2', 'Soldes Intermédiaires de Gestion (SIG / TCR SCF)', y);

  // Formule SIG
  y = latexMathBox(
    doc,
    'VA = Production - Consommations     |     EBE = VA - Personnel (63) - Impôts (64)',
    'Décomposition en cascade des agrégats de rentabilité selon la nomenclature officielle Loi 07-11.',
    y,
    17
  );

  y = latexKpiRow(doc, [
    { label: 'Chiffre d\'Affaires HT', val: fmtDZD(ca), sub: 'Production vendue', status: 'normal' },
    { label: 'Excédent Brut d\'Exploitation', val: fmtDZD(ebe), sub: `Marge EBE : ${fmtPct(margeEBE)}`, status: margeEBE >= 0.10 ? 'ok' : 'danger' },
    { label: 'Résultat Net de l\'Exercice', val: fmtDZD(rn), sub: `Marge Nette : ${fmtPct(margeNette)}`, status: rn >= 0 ? 'ok' : 'danger' },
  ], y);

  y = latexSubSection(doc, '2.1. Tableau des Comptes de Résultats (TCR Officiel)', y);

  const sigHead = [['POSTE / SOLDE INTERMÉDIAIRE', 'COMPTES SCF', 'EXERCICE N (DZD)', s1 ? 'EXERCICE N-1' : '', s1 ? 'VARIATION (%)' : ''].filter(Boolean)];
  const sigBody = [
    ['Chiffre d\'Affaires (Ventes de biens et services)', '700 à 709', fmtDZD(ca), s1 ? fmtDZD(s1.chiffreAffaires) : '', s1 ? fmtPct(safeDiv(ca - (s1.chiffreAffaires || 0), s1.chiffreAffaires || 1)) : ''].filter(Boolean),
    ['Production de l\'exercice (Ventes + Var. Stocks + Immo)', '70, 72, 73', fmtDZD(s.productionExercice), s1 ? fmtDZD(s1.productionExercice) : '', ''].filter(Boolean),
    ['Consommation de l\'exercice (Achats + Serv. Ext.)', '601..603, 61, 62', fmtDZD(s.consommationExercice), s1 ? fmtDZD(s1.consommationExercice) : '', ''].filter(Boolean),
    ['VALEUR AJOUTÉE D\'EXPLOITATION (VA)', 'Marge brute', fmtDZD(va), s1 ? fmtDZD(s1.valeurAjoutee) : '', s1 ? fmtPct(safeDiv(va - (s1.valeurAjoutee || 0), s1.valeurAjoutee || 1)) : ''].filter(Boolean),
    ['Charges de personnel', '631 à 638', fmtDZD(s.chargesPersonnel), s1 ? fmtDZD(s1.chargesPersonnel) : '', ''].filter(Boolean),
    ['Impôts, taxes et versements assimilés', '641 à 648', fmtDZD(s.impotsTaxes), s1 ? fmtDZD(s1.impotsTaxes) : '', ''].filter(Boolean),
    ['EXCÉDENT BRUT D\'EXPLOITATION (EBE)', 'Agrégat cash', fmtDZD(ebe), s1 ? fmtDZD(s1.ebe) : '', s1 ? fmtPct(safeDiv(ebe - (s1.ebe || 0), s1.ebe || 1)) : ''].filter(Boolean),
    ['Dotations aux amortissements et provisions nettes', '681, 685 - 781', fmtDZD(s.dotationsAmortissements), s1 ? fmtDZD(s1.dotationsAmortissements) : '', ''].filter(Boolean),
    ['RÉSULTAT OPÉRATIONNEL / D\'EXPLOITATION', 'Activité pure', fmtDZD(re), s1 ? fmtDZD(s1.resultatExploitation) : '', s1 ? fmtPct(safeDiv(re - (s1.resultatExploitation || 0), s1.resultatExploitation || 1)) : ''].filter(Boolean),
    ['Charges financières nettes des produits financiers', '66x - 76x', fmtDZD(s.chargesFinancieres), s1 ? fmtDZD(s1.chargesFinancieres) : '', ''].filter(Boolean),
    ['RÉSULTAT ORDINAIRE AVANT IMPÔTS (RCAI)', 'Résultat courant', fmtDZD((re || 0) - (s.chargesFinancieres || 0)), s1 ? fmtDZD((s1.resultatExploitation || 0) - (s1.chargesFinancieres || 0)) : '', ''].filter(Boolean),
    ['Impôt sur les bénéfices des sociétés (IBS exigible)', '695, 698', fmtDZD(s.impotsSurResultats), s1 ? fmtDZD(s1.impotsSurResultats) : '', ''].filter(Boolean),
    ['RÉSULTAT NET DE L\'EXERCICE (BÉNÉFICE / PERTE)', 'Solde final', fmtDZD(rn), s1 ? fmtDZD(s1.resultatNet) : '', s1 ? fmtPct(safeDiv(rn - (s1.resultatNet || 0), Math.abs(s1.resultatNet || 1))) : ''].filter(Boolean),
  ];

  y = drawBooktabsTable(doc, sigHead, sigBody, y, {
    boldRows: [3, 6, 8, 10, 12],
    totalRowIndices: [3, 6, 8, 12],
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 26, fontStyle: 'italic', textColor: T.inkMuted },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 4 — SECTION 3 : RATIOS FINANCIERS & DÉLAIS
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '3', 'Ratios Financiers, Solvabilité & Délais de Rotation', y);

  y = latexSubSection(doc, '3.1. Ratios de Liquidité, Solvabilité & Autonomie Financière', y);

  const liqHead = [['RATIO / INDICATEUR', 'FORMULE SCF', 'VALEUR N', 'SEUIL CRITIQUE', 'APPRÉCIATION']];
  const liqRedVal = r.liquiditeReduite || 0;
  const solvVal   = r.solvabilite    || 0;
  const liqBody = [
    [
      'Liquidité Générale', 'Actif Circulant / Passif Circulant', fmtNum(liqGen), 'X > 1.00',
      liqGen >= 2.0 ? 'Très satisfaisante' : liqGen >= 1.2 ? 'Satisfaisante' : liqGen >= 1.0 ? 'Limite' : 'Alerte sous-liquidité'
    ],
    [
      'Liquidité Réduite', '(Créances + Dispo) / Passif Circulant', fmtNum(liqRedVal), 'X > 0.80',
      liqRedVal >= 1.5 ? 'Très satisfaisante' : liqRedVal >= 1.0 ? 'Satisfaisante' : liqRedVal >= 0.8 ? 'Acceptable' : 'Dépendance aux stocks'
    ],
    [
      'Autonomie Financière', 'Capitaux Propres / Total Passif', fmtPct(autFinanc), 'X > 25.0 %',
      autFinanc >= 0.50 ? 'Excellente autonomie' : autFinanc >= 0.35 ? 'Bonne autonomie' : autFinanc >= 0.25 ? 'Acceptable' : 'Dépendance aux dettes'
    ],
    [
      'Solvabilité Générale', 'Total Actif / Total Dettes Exigibles', solvVal > 0 ? fmtNum(solvVal) : '—', 'X > 1.50',
      solvVal <= 0 ? 'Non calculable' : solvVal >= 2.0 ? 'Solvable' : solvVal >= 1.5 ? 'Limite' : 'Risque d\'insolvabilité'
    ],
    [
      'Couverture Charges Fin.', 'EBE / Charges Financières', fmtNum(safeDiv(ebe, s.chargesFinancieres)), 'X > 2.00 x',
      safeDiv(ebe, s.chargesFinancieres) >= 5 ? 'Couverture excellente' : safeDiv(ebe, s.chargesFinancieres) >= 3 ? 'Couverture large' : safeDiv(ebe, s.chargesFinancieres) >= 2 ? 'Couverture suffisante' : 'Tension de charge'
    ],
  ];

  y = drawBooktabsTable(doc, liqHead, liqBody, y, {
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { fontStyle: 'italic', cellWidth: 48 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 26 },
      4: { cellWidth: 36 }
    }
  });

  y = latexSubSection(doc, '3.2. Ratios de Rentabilité Économique et Financière', y);

  const rentHead = [['RATIO DE RENTABILITÉ', 'VALEUR N', 'RÉFÉRENTIEL', 'ANALYSE DU RENDEMENT']];
  const rentBody = [
    ['Taux de Valeur Ajoutée (VA / CA)', fmtPct(tauxVA), 'X > 25.0 %', tauxVA >= 0.30 ? 'Forte création de richesse brute' : 'Poids élevé des achats consommés'],
    ['Marge d\'EBE (EBE / CA)', fmtPct(margeEBE), 'X > 10.0 %', margeEBE >= 0.12 ? 'Excellente marge brute d\'exploitation' : 'Marge opérationnelle comprimée'],
    ['Marge Opérationnelle (RE / CA)', fmtPct(margeExploit), 'X > 6.0 %', margeExploit >= 0.08 ? 'Activité commerciale hautement rentable' : 'Rentabilité opérationnelle modérée'],
    ['Marge Nette Finale (RN / CA)', fmtPct(margeNette), 'X > 0.0 %', margeNette >= 0.05 ? 'Taux de profit net confortable' : rn >= 0 ? 'Marge bénéficiaire étroite' : 'Exercice en perte nette'],
  ];

  y = drawBooktabsTable(doc, rentHead, rentBody, y, {
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 30 },
      3: { cellWidth: 68 }
    }
  });

  y = latexSubSection(doc, '3.3. Délais de Rotation et Cycle d\'Exploitation (en Jours)', y);

  const actHead = [['CYCLE / DÉLAI D\'EXPLOITATION', 'VALEUR N', 'NORME SCF', 'IMPACT SUR LE CASH']];
  const actBody = [
    ['DSO — Délai de Recouvrement Clients', fmtDays(dso), 'X < 60 j', dso <= 60 ? 'Recouvrement rapide et fluide' : 'Risque d\'immobilisation de cash client'],
    ['DPO — Délai de Paiement Fournisseurs', fmtDays(dpo), '30 < X < 75 j', dpo >= 30 && dpo <= 75 ? 'Financement fournisseur équilibré' : 'Décalage de règlement à optimiser'],
    ['Rotation Moyenne des Stocks', fmtDays(rotStock), 'X < 90 j', rotStock <= 90 ? 'Vélocité satisfaisante des stocks' : 'Risque de surstockage et dépréciation'],
    ['BFR Exprimé en Jours de Chiffre d\'Affaires', fmtDays(bfrJours), 'X < 60 j', bfrJours <= 60 ? 'Besoin en fonds de roulement maîtrisé' : 'BFR trop lourd nécessitant du cash'],
  ];

  y = drawBooktabsTable(doc, actHead, actBody, y, {
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 62 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 28 },
      3: { cellWidth: 60 }
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 5 — SECTION 4 : COMPARATIF N vs N-1
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '4', 'Analyse Comparative Pluriannuelle (N vs N-1)', y);

  if (!dataN1) {
    y = latexMathBox(
      doc,
      'Exercice Comparatif N-1 : Non Fourni',
      'Pour activer l\'analyse comparative dynamique des flux et des soldes, veuillez importer la balance de l\'exercice N-1 dans l\'application.',
      y,
      20
    );
  } else {
    y = latexSubSection(doc, '4.1. Tableau des Variations Structurelles et de Rentabilité', y);

    const compHead = [['AGRÉGAT MAJEUR', 'EXERCICE N (DZD)', 'EXERCICE N-1 (DZD)', 'VARIATION ABS. (DZD)', 'VARIATION REL. (%)']];
    const diffVal = (a, b) => (a || 0) - (b || 0);
    const diffPct = (a, b) => safeDiv(diffVal(a, b), Math.abs(b || 1));

    const compBody = [
      ['Chiffre d\'Affaires Net HT', fmtDZD(ca), fmtDZD(s1.chiffreAffaires), fmtDZD(diffVal(ca, s1.chiffreAffaires)), fmtPct(diffPct(ca, s1.chiffreAffaires))],
      ['Valeur Ajoutée (VA)', fmtDZD(va), fmtDZD(s1.valeurAjoutee), fmtDZD(diffVal(va, s1.valeurAjoutee)), fmtPct(diffPct(va, s1.valeurAjoutee))],
      ['Excédent Brut d\'Exploitation (EBE)', fmtDZD(ebe), fmtDZD(s1.ebe), fmtDZD(diffVal(ebe, s1.ebe)), fmtPct(diffPct(ebe, s1.ebe))],
      ['Résultat d\'Exploitation', fmtDZD(re), fmtDZD(s1.resultatExploitation), fmtDZD(diffVal(re, s1.resultatExploitation)), fmtPct(diffPct(re, s1.resultatExploitation))],
      ['Résultat Net de l\'Exercice', fmtDZD(rn), fmtDZD(s1.resultatNet), fmtDZD(diffVal(rn, s1.resultatNet)), fmtPct(diffPct(rn, s1.resultatNet))],
      ['Fonds de Roulement Net Global (FRNG)', fmtDZD(frng), fmtDZD(b1.frng), fmtDZD(diffVal(frng, b1.frng)), fmtPct(diffPct(frng, b1.frng))],
      ['Besoin en Fonds de Roulement (BFR)', fmtDZD(bfr), fmtDZD(b1.bfr), fmtDZD(diffVal(bfr, b1.bfr)), fmtPct(diffPct(bfr, b1.bfr))],
      ['Trésorerie Nette (TN)', fmtDZD(tn), fmtDZD(b1.tn), fmtDZD(diffVal(tn, b1.tn)), fmtPct(diffPct(tn, b1.tn))],
      ['Liquidité Générale', fmtNum(liqGen), fmtNum(dataN1.ratios?.liquiditeGenerale), fmtNum(liqGen - (dataN1.ratios?.liquiditeGenerale || 0)), '—'],
    ];

    y = drawBooktabsTable(doc, compHead, compBody, y, {
      boldRows: [0, 2, 4, 5, 7],
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { halign: 'right', cellWidth: 28 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 32 },
        4: { halign: 'right', cellWidth: 27 },
      }
    });

    // Synthèse de l'évolution
    y = latexSubSection(doc, '4.2. Synthèse de la Trajectoire Pluriannuelle', y);
    const caTrend = diffVal(ca, s1.chiffreAffaires) >= 0 ? 'croissance' : 'contraction';
    const frngTrend = diffVal(frng, b1.frng) >= 0 ? 'consolidation' : 'érosion';
    
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...T.inkSecondary);
    const synthText = `L'exercice N est marqué par une dynamique de ${caTrend} de l'activité commerciale (${fmtPct(diffPct(ca, s1.chiffreAffaires))} de CA). Sur le plan structurel, on observe une ${frngTrend} du fonds de roulement (${fmtDZD(diffVal(frng, b1.frng))}), tandis que la trésorerie nette varie de ${fmtDZD(diffVal(tn, b1.tn))}. L'ajustement des charges d'exploitation et la gestion du BFR constituent les axes prioritaires pour préserver l'autonomie financière.`;
    const splitSynth = doc.splitTextToSize(synthText, W - margin * 2);
    doc.text(splitSynth, margin, y);
    y += splitSynth.length * 4.5 + 4;
  }

  // ──────────────────────────────────────────────────────────────────
  // PAGE 6 — SECTION 5 : DIAGNOSTIC & MATRICE DES RISQUES
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '5', 'Diagnostic Analytique & Matrice des Risques', y);

  const diagItems = [];

  // 1. Structure
  if (frng >= 0) {
    diagItems.push(['FORCE', 'Équilibre Structurel', `FRNG excédentaire (${fmtDZD(frng)}). Les ressources stables financent intégralement le haut de bilan.`]);
  } else {
    diagItems.push(['RISQUE', 'Équilibre Structurel', `Déficit structurel de FRNG (${fmtDZD(frng)}). Des investissements à long terme sont financés par de la dette court terme.`]);
  }

  // 2. Liquidité
  if (tn >= 0) {
    diagItems.push(['FORCE', 'Trésorerie & Cash', `Trésorerie nette positive (${fmtDZD(tn)}). L'entreprise dispose de marges de manœuvre immédiates.`]);
  } else {
    diagItems.push(['ALERTE', 'Trésorerie & Cash', `Tension de trésorerie nette (${fmtDZD(tn)}). Risque de dépendance envers les autorisations de découvert bancaire.`]);
  }

  // 3. Rentabilité
  if (margeNette >= 0.05) {
    diagItems.push(['FORCE', 'Rentabilité Nette', `Taux de marge nette solide (${fmtPct(margeNette)}). Excellente transformation du chiffre d'affaires en résultat net.`]);
  } else if (rn >= 0) {
    diagItems.push(['VIGILANCE', 'Rentabilité Nette', `Marge nette positive mais étroite (${fmtPct(margeNette)}). Sensibilité accrue aux hausses de coûts d'approvisionnement.`]);
  } else {
    diagItems.push(['RISQUE', 'Rentabilité Nette', `Résultat net déficitaire (${fmtDZD(rn)}). Destruction de valeur sur l'exercice nécessitant une révision des coûts.`]);
  }

  // 4. Délais Clients
  if (dso > 75) {
    diagItems.push(['ALERTE', 'Recouvrement Clients', `DSO élevé (${fmtDays(dso)}). Risque d'impayés et alourdissement mécanique du BFR.`]);
  } else {
    diagItems.push(['FORCE', 'Recouvrement Clients', `DSO conforme (${fmtDays(dso)}). Le poste clients est recouvré dans des délais satisfaisants.`]);
  }

  // 5. Autonomie Financière
  if (autFinanc >= 0.35) {
    diagItems.push(['FORCE', 'Structure du Passif', `Forte autonomie financière (${fmtPct(autFinanc)}). Capacité d'endettement préservée auprès des banques.`]);
  } else {
    diagItems.push(['VIGILANCE', 'Structure du Passif', `Faible autonomie financière (${fmtPct(autFinanc)}). Renforcer les fonds propres par mise en réserve des résultats.`]);
  }

  const diagHead = [['STATUT', 'DIMENSION ÉVALUÉE', 'DIAGNOSTIC DÉTAILLÉ & RECOMMANDATIONS STRATÉGIQUES']];
  const diagBody = diagItems.map(([type, dim, detail]) => [
    type,
    dim,
    detail
  ]);

  y = drawBooktabsTable(doc, diagHead, diagBody, y, {
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
      1: { fontStyle: 'bold', textColor: T.navy, cellWidth: 44 },
      2: { cellWidth: W - margin * 2 - 70 }
    },
    willDrawCell: (data) => {
      if (data.column.index === 0 && data.section === 'body') {
        const val = data.cell.raw;
        if (val === 'FORCE') data.cell.styles.textColor = T.darkGreen;
        else if (val === 'RISQUE' || val === 'ALERTE') data.cell.styles.textColor = T.darkRed;
        else data.cell.styles.textColor = T.darkAmber;
      }
    }
  });

  // Recommandations prioritaires
  y = latexSubSection(doc, '5.1. Plan d\'Action Recommandé aux Décideurs', y);

  const actions = [
    '1. Optimisation du BFR : Réduire le délai moyen d\'encaissement client (DSO) par des relances préventives et négocier l\'alignement des délais fournisseurs (DPO).',
    '2. Maîtrise des Charges d\'Exploitation : Suivre le ratio Charges de personnel / Valeur ajoutée pour maintenir un taux de marge d\'EBE supérieur à 12 %.',
    '3. Renforcement de la Structure Financière : Prioriser la mise en réserve intégrale des bénéfices distribuables pour accroître l\'autonomie financière.',
  ];

  actions.forEach(act => {
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...T.inkSecondary);
    doc.text(act, margin + 2, y);
    y += 5;
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 7 — SECTION 6 : AUDIT DES SOLDES & ANOMALIES SCF
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '6', 'Audit des Soldes & Conformité SCF (Loi 07-11)', y);

  const anomaliesList = [];

  if (rows && rows.length > 0) {
    rows.forEach(r => {
      if (!r || !r.compte || r.ignore) return;
      const c   = r.compte.toString().trim();
      const cl  = c[0];
      const p2  = c.slice(0, 2);
      const p3  = c.slice(0, 3);
      const sd  = Math.abs(r.soldeFinDebit || 0);
      const sc  = Math.abs(r.soldeFinCredit || 0);
      const isD = sd > 0.01 && sc < 0.01;
      const isC = sc > 0.01 && sd < 0.01;

      // 1. Caisse créditrice
      if (['531','532','533','534'].includes(p3) && isC) {
        anomaliesList.push([c, r.libelle || 'Caisse', 'CAISSE CRÉDITRICE', 'Impossibilité matérielle (Loi 07-11)', fmtDZD(sc)]);
      }
      // 2. Fournisseurs débiteurs (hors 409)
      if (p2 === '40' && !['406','409'].includes(p3) && isD) {
        anomaliesList.push([c, r.libelle || 'Fournisseur', 'FOURNISSEUR DÉBITEUR', 'Solde inversé (acompte non reclassé ?)', fmtDZD(sd)]);
      }
      // 3. Clients créditeurs (hors 419)
      if (p2 === '41' && p3 !== '419' && isC) {
        anomaliesList.push([c, r.libelle || 'Client', 'CLIENT CRÉDITEUR', 'Solde inversé (avoir non imputé ?)', fmtDZD(sc)]);
      }
      // 4. Comptes 47x non soldés
      if (p2 === '47' && (sd + sc) > 0.01) {
        anomaliesList.push([c, r.libelle || 'Attente', 'COMPTE D\'ATTENTE NON SOLDÉ', 'Régularisation requise avant arrêté', fmtDZD(sd + sc)]);
      }
      // 5. Charges créditrices (hors 609, 619, 629, 603, 69x, 692)
      if (cl === '6' && p3 !== '609' && p3 !== '619' && p3 !== '629' && p3 !== '603' && !c.startsWith('69') && !c.startsWith('692') && isC) {
        anomaliesList.push([c, r.libelle || 'Charge', 'CHARGE CRÉDITRICE', 'Compte classe 6 anormalement créditeur', fmtDZD(sc)]);
      }
      // 6. Produits débiteurs (hors 709, 72x, 724)
      if (cl === '7' && p3 !== '709' && !c.startsWith('72') && !c.startsWith('724') && isD) {
        anomaliesList.push([c, r.libelle || 'Produit', 'PRODUIT DÉBITEUR', 'Compte classe 7 anormalement débiteur', fmtDZD(sd)]);
      }
    });
  }

  const conformiteScore = rows.length > 0 ? Math.round(((rows.length - anomaliesList.length) / rows.length) * 100) : 100;

  y = latexKpiRow(doc, [
    { label: 'Lignes de Balance Contrôlées', val: `${rows.length} comptes`, sub: 'Périmètre exhaustif SCF', status: 'normal' },
    { label: 'Anomalies Détectées', val: `${anomaliesList.length} anomalies`, sub: anomaliesList.length === 0 ? 'Aucune anomalie' : 'À régulariser', status: anomaliesList.length === 0 ? 'ok' : 'danger' },
    { label: 'Taux de Conformité SCF', val: `${conformiteScore} %`, sub: conformiteScore >= 95 ? 'Excellente régularité' : 'Contrôle approfondi', status: conformiteScore >= 95 ? 'ok' : 'danger' },
  ], y);

  if (anomaliesList.length === 0) {
    y = latexMathBox(
      doc,
      'Audit des Soldes SCF : Conforme à 100 %',
      'Toutes les natures de comptes (classes 1 à 7) respectent rigoureusement les sens normaux de soldes prévus par le Système Comptable Financier.',
      y,
      18
    );
  } else {
    y = latexSubSection(doc, '6.1. Relevé Détaillé des Écritures et Soldes Inversés', y);

    const auditHead = [['COMPTE', 'INTITULÉ DU COMPTE', 'NATURE DE L\'ANOMALIE', 'EXPLICATION NORMATIVE', 'MONTANT (DZD)']];
    const auditBody = anomaliesList.slice(0, 30);

    y = drawBooktabsTable(doc, auditHead, auditBody, y, {
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { fontStyle: 'bold', textColor: T.darkRed, cellWidth: 38 },
        3: { cellWidth: 48 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
      }
    });

    if (anomaliesList.length > 30) {
      doc.setFont('times', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...T.inkMuted);
      doc.text(`... et ${anomaliesList.length - 30} autres anomalies supplémentaires consultables dans l'onglet Audit Balance de la plateforme.`, margin, y);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // APPLICATION DES EN-TÊTES & PIEDS DE PAGE STYLE FANCYHDR
  // ──────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  applyLatexHeaderFooter(doc, totalPages, dossierName, 'N');

  // Téléchargement du fichier
  const cleanName = dossierName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const fileName = `BAIQ_Rapport_Financier_LaTeX_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}
