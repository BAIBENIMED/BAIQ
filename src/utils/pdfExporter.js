/* ═══════════════════════════════════════════════════════════════════════
   BAIQ — Exporteur PDF, Rapport Financier Professionnel
   Identité visuelle alignée sur la charte BAIQ (teinte sarcelle + accent or)
   Conforme au Système Comptable Financier (SCF Algérie)
   ═══════════════════════════════════════════════════════════════════════ */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { calculateAltmanZScore } from './solvabiliteEngine';
import { buildTCRRows } from './financeCalculations';

// ── Palette BAIQ — reprend exactement les jetons de couleur de l'application
// (src/index.css :root, mode clair) pour que le document imprimé soit
// visuellement cohérent avec l'écran, plutôt qu'une charte générique.
const T = {
  inkPrimary:   [17, 24, 39],       // Noir d'encre profond (#111827)
  inkSecondary: [55, 65, 81],       // Gris foncé texte (#374151)
  inkMuted:     [107, 114, 128],    // Gris moyen (#6b7280)
  inkLight:     [156, 163, 175],    // Gris clair légendes (#9ca3af)

  navy:         [18, 79, 102],      // --primary-dk BAIQ (#124f66)
  darkRed:      [220, 38, 38],      // --red BAIQ (#dc2626)
  darkGreen:    [5, 150, 105],      // --green BAIQ (#059669)
  darkAmber:    [156, 110, 30],     // --accent-dk BAIQ, or institutionnel (#9c6e1e)

  ruleHeavy:    [18, 79, 102],      // Ligne principale 1.0pt — teinte sarcelle BAIQ
  ruleMedium:   [107, 114, 128],    // Ligne médiane 0.6pt
  ruleLight:    [209, 213, 219],    // Filet léger 0.3pt (#d1d5db)
  boxBg:        [240, 248, 250],    // --primary-lt2 BAIQ (#f0f8fa) — même fond que les cartes à l'écran
  boxBorder:    [220, 238, 242],    // --primary-lt BAIQ (#dceef2)
  accentBg:     [246, 232, 204],    // --accent-lt BAIQ, or discret (#f6e8cc)

  gold:         [192, 138, 46],     // --accent BAIQ (#c08a2e) — touche de couleur signature
};

// ── Fonctions Utilitaires de Formatage ─────────────────────────────────
// Note : fmtDZD (devise/arrondi du dossier) est défini localement dans generateFullPDF,
// seule fonction qui l'utilise — cf. plus bas.

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

// Capture le badge BAIQ RÉEL affiché dans la barre latérale de l'application (voir
// App.jsx, .baiq-logo-badge : carré noir arrondi, "B" blanc, point rouge + barre blanche
// formant un "i" stylisé) via html2canvas, pour une fidélité pixel-parfaite à l'interface
// — un rendu vectoriel à la main s'était révélé imprécis (proportions Flexbox difficiles
// à reproduire à l'identique). Retourne { dataUrl, ratio } ou null si la capture échoue
// (badge non monté dans le DOM, etc.) ; l'appelant doit alors se rabattre sur du texte seul.
async function captureBaiqBadge() {
  try {
    const el = document.querySelector('.baiq-logo-badge');
    if (!el) return null;
    const canvas = await html2canvas(el, { scale: 8, backgroundColor: null });
    // Un badge non visible (sidebar repliée en mode mobile, onglet en arrière-plan, etc.)
    // produit un canvas 0×0 — dataURL invalide qui ferait échouer doc.addImage() plus loin.
    if (!canvas.width || !canvas.height) return null;
    return { dataUrl: canvas.toDataURL('image/png'), ratio: canvas.height / canvas.width };
  } catch {
    return null;
  }
}

// Dessine le badge à la position/taille données. Utilise l'image capturée si disponible,
// sinon un repli vectoriel simplifié (texte "B" seul) pour ne jamais faire échouer l'export.
function drawBaiqBadge(doc, x, y, size, badgeImg) {
  if (badgeImg) {
    doc.addImage(badgeImg.dataUrl, 'PNG', x, y, size, size * badgeImg.ratio);
    return;
  }
  doc.setFillColor(10, 10, 10);
  doc.roundedRect(x, y, size, size, size * 0.28, size * 0.28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.55);
  doc.setTextColor(255, 255, 255);
  doc.text('B', x + size / 2, y + size * 0.68, { align: 'center' });
}

// Lockup complet (badge + wordmark "BAIQ" + ligne de signature), pour la page de garde.
// `align` : 'center' centre l'ensemble sur x ; 'left' démarre le badge à x.
function drawBaiqMark(doc, x, y, badgeSize = 12, align = 'left', badgeImg = null) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(badgeSize * 1.05);
  const wordmarkW = doc.getTextWidth('BAIQ');
  const gap = badgeSize * 0.28;
  const totalW = badgeSize + gap + wordmarkW;
  const startX = align === 'center' ? x - totalW / 2 : x;

  drawBaiqBadge(doc, startX, y, badgeSize, badgeImg);

  const textX = startX + badgeSize + gap;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(badgeSize * 1.05);
  doc.setTextColor(...T.inkPrimary);
  doc.text('BAIQ', textX, y + badgeSize * 0.56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(badgeSize * 0.24);
  doc.setTextColor(27, 110, 140); // --primary BAIQ (#1b6e8c)
  doc.text('BALANCE AND FINANCIAL ANALYTICS', textX, y + badgeSize * 0.88);

  return { width: totalW, startX };
}

// ── En-tête et Pied de Page — bandeau institutionnel BAIQ ──────────────
function applyLatexHeaderFooter(doc, totalPages, dossierName, exerciceYear = 'N', badgeImg = null) {
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

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...T.inkMuted);
      doc.text('BAIQ Platform — Rapport financier confidentiel à usage de gestion et d\'audit.', margin, H - 10);
      doc.text('Page 1', W - margin, H - 10, { align: 'right' });
      continue;
    }

    // ── En-tête de page ──
    const badgeSize = 6.5;
    drawBaiqBadge(doc, margin, 7, badgeSize, badgeImg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...T.navy);
    doc.text('BAIQ', margin + badgeSize + 2.5, 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...T.inkMuted);
    doc.text(' · Système Comptable Financier (SCF)', margin + badgeSize + 2.5 + doc.getTextWidth('BAIQ'), 12);

    // Dossier et exercice à droite
    doc.setTextColor(...T.inkSecondary);
    doc.text(`${dossierName} · Exercice ${exerciceYear}`, W - margin, 12, { align: 'right' });

    // Filet d'en-tête — teinte de marque BAIQ
    doc.setDrawColor(...T.navy);
    doc.setLineWidth(0.5);
    doc.line(margin, 14.5, W - margin, 14.5);

    // ── Pied de page ──
    doc.setDrawColor(...T.ruleLight);
    doc.setLineWidth(0.3);
    doc.line(margin, H - 14, W - margin, H - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.inkMuted);

    // Texte raccourci pour ne jamais chevaucher le folio centré, quelle que soit la longueur
    // du nom de mois (« septembre »/« novembre » vs « mai ») — l'ancien texte, plus long
    // (« ... · Traitement local sécurisé »), débordait jusqu'à s'y superposer.
    const printDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Document généré le ${printDate}`, margin, H - 9);

    // Folio centré
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...T.inkPrimary);
    doc.text(`— ${p} / ${totalPages} —`, W / 2, H - 9, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.gold);
    doc.text('BAIQ', W - margin, H - 9, { align: 'right' });
  }
}

// Empêche un titre de se retrouver seul en bas de page (règle typographique de base :
// un titre doit toujours être suivi d'au moins un peu de son contenu). Si l'espace restant
// avant le pied de page est insuffisant, force un saut de page et repart du haut.
function ensurePageSpace(doc, y, minSpace) {
  const H = doc.internal.pageSize.getHeight();
  const footerZone = 20; // hauteur réservée au pied de page
  if (y + minSpace > H - footerZone) {
    doc.addPage();
    return 22; // marge haute standard, cohérente avec le reste du document
  }
  return y;
}

// ── Titre de Section — bandeau coloré avec pastille numérotée BAIQ ─────
function latexSection(doc, number, title, y) {
  y = ensurePageSpace(doc, y, 24);
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  const bandH = 9;

  // Bandeau de fond teinté (identique aux cartes de section à l'écran)
  doc.setFillColor(...T.boxBg);
  doc.rect(margin, y, W - margin * 2, bandH, 'F');

  // Pastille numérotée — accent or, signature BAIQ
  doc.setFillColor(...T.gold);
  doc.rect(margin, y, bandH, bandH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(String(number), margin + bandH / 2, y + bandH / 2 + 3.2, { align: 'center' });

  // Titre en capitales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...T.navy);
  doc.text(title.toUpperCase(), margin + bandH + 4, y + bandH / 2 + 1.6);

  // Filet de rappel — teinte de marque
  doc.setDrawColor(...T.navy);
  doc.setLineWidth(0.6);
  doc.line(margin, y + bandH + 1.5, W - margin, y + bandH + 1.5);

  return y + bandH + 7;
}

// ── Sous-titre ───────────────────────────────────────────────────────
function latexSubSection(doc, title, y) {
  y = ensurePageSpace(doc, y, 32);
  const margin = 18;
  // Petit repère vertical or — cohérent avec la pastille de section
  doc.setFillColor(...T.gold);
  doc.rect(margin, y - 3, 1.4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.navy);
  doc.text(title, margin + 4, y);
  return y + 5;
}

// ── Boîte de Définition / Formule Mathématique ────────
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.navy);
  doc.text(formulaText, margin + 8, y + 7);

  if (subtitle) {
    doc.setFont('helvetica', 'italic');
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
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...T.inkMuted);
    doc.text(item.label, x + 4, y + 6);

    // Valeur principale en chiffres gras
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...barColor);
    doc.text(item.val, x + 4, y + 13);

    // Note de bas
    if (item.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...T.inkSecondary);
      doc.text(item.sub, x + 4, y + 18);
    }
  });

  return y + h + 6;
}

// ── Table Booktabs Standard ─────────────────────────────────────
function drawBooktabsTable(doc, head, body, startY, opts = {}) {
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();

  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: margin, right: margin },
    theme: 'plain', // Filets sobres façon booktabs, sans zébrage
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: T.inkPrimary,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineWidth: 0,
      lineColor: T.ruleLight,
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8,
      textColor: T.navy,
      fillColor: T.boxBg, // Léger fond teinté — cohérent avec les cartes de l'écran
      lineWidth: 0,
    },
    columnStyles: opts.columnStyles || {},
    // didParseCell (pas willDrawCell) : autoTable calcule déjà la police au moment du parsing,
    // pour la mesure du texte — une mutation de style dans willDrawCell arrive trop tard et
    // n'affecte pas le rendu du glyphe (bug constaté : boldRows ne produisait aucun gras malgré
    // la mutation). didParseCell s'exécute avant cette mesure, donc avant le rendu réel.
    didParseCell: (data) => {
      // Toute colonne alignée à droite représente un montant dans ce document (convention
      // constante du fichier) — mise en gras systématique pour une meilleure lisibilité des
      // chiffres, y compris hors lignes de total (déjà en gras via boldRows ci-dessous).
      if (data.section === 'body' && data.cell.styles.halign === 'right') {
        data.cell.styles.fontStyle = 'bold';
      }
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
export async function generateFullPDF(data, cur, isSimulated = false, scenarioLabel = null) {
  const { bilan = {}, sig = {}, ratios = {}, rows = [], profil = {}, dataN1, bilanSCF = {} } = data || {};
  const r = ratios;
  const s = sig;
  const b = bilan;
  const b1 = dataN1?.bilan || null;
  const s1 = dataN1?.sig || null;
  const bScf1 = dataN1?.bilanSCF || null;

  // Devise et arrondi déclarés par l'utilisateur (fenêtre de finalisation post-import /
  // Paramètres) — remplace le fmtDZD générique par défaut pour ce document précis.
  const docCurrency = cur || profil?.currency || 'DZD';
  const docRounding = profil?.rounding ?? 0;
  const fmtDZD = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    const num = Number(v);
    const sign = num < 0 ? '-' : '';
    const [intPart, decPart] = Math.abs(num).toFixed(docRounding).split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sign}${formattedInt}${decPart ? ',' + decPart : ''} ${docCurrency}`;
  };

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

  // Solvabilité : calculer depuis le bilan si non disponible dans les ratios
  const totalActif      = (b.emploisStables || 0) + (b.actifCirculant || 0) + (b.tresorerieActive || 0);
  const totalDettesExig = (b.passifCirculant || 0) + (b.tresoreriePassive || 0) + (b.dettesMoyenLongTerme || 0);
  const solvabiliteCalc = totalDettesExig > 0.01 ? safeDiv(totalActif, totalDettesExig) : 0;
  const solvabiliteVal  = (r.solvabilite && r.solvabilite > 0) ? r.solvabilite : solvabiliteCalc;

  // Capture pixel-parfaite du badge réel de l'interface (voir captureBaiqBadge ci-dessus) —
  // avant toute manipulation du document, pour ne pas dépendre d'un état DOM qui changerait.
  const badgeImg = await captureBaiqBadge();

  // Création du document jsPDF (Format A4 standardisé)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;

  // ──────────────────────────────────────────────────────────────────
  // PAGE 1 — PAGE DE TITRE
  // ──────────────────────────────────────────────────────────────────
  let y = 30;

  // Logo BAIQ centré — identique au mark de l'interface (badge "B" + wordmark + signature)
  drawBaiqMark(doc, W / 2, y, 16, 'center', badgeImg);
  y += 20;

  // Filet d'accent — teinte de marque
  doc.setDrawColor(...T.navy);
  doc.setLineWidth(1.0);
  doc.line(margin + 20, y, W - margin - 20, y);
  doc.setDrawColor(...T.gold);
  doc.setLineWidth(0.6);
  doc.line(margin + 20, y + 1.6, W - margin - 20, y + 1.6);
  y += 16;

  // Titre Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...T.navy);
  doc.text('RAPPORT D\'ANALYSE FINANCIÈRE', W / 2, y, { align: 'center' });
  y += 7.5;
  doc.setFontSize(14);
  doc.text('ET D\'AUDIT DES ÉTATS DE SYNTHÈSE', W / 2, y, { align: 'center' });
  y += 6;

  // Sous-titre descriptif
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.inkSecondary);
  doc.text('Diagnostic structurel de liquidité, rentabilité, équilibre fonctionnel et solvabilité', W / 2, y, { align: 'center' });
  y += 14;

  // Bloc Métadonnées du Dossier
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

  // Résumé Exécutif
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.navy);
  doc.text('RÉSUMÉ EXÉCUTIF', margin, y);
  y += 4.5;

  const abstractText = `Le présent document constitue une analyse financière intégrale de l'entité ${dossierName} établie selon les prescriptions du Système Comptable Financier (SCF). L'évaluation porte sur la structure du bilan fonctionnel (FRNG : ${fmtDZD(frng)}, BFR : ${fmtDZD(bfr)}), la performance économique (EBE : ${fmtDZD(ebe)}, RN : ${fmtDZD(rn)}) et la conformité des soldes de balance avec les règles légales d'imputation. Les flux et ratios ont été vérifiés selon les normes sectorielles de la Banque d'Algérie.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...T.inkSecondary);
  const splitAbstract = doc.splitTextToSize(abstractText, W - margin * 2);
  doc.text(splitAbstract, margin, y);
  y += splitAbstract.length * 4 + 8;

  // Table des Matières (avec points de conduite)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...T.navy);
  doc.text('TABLE DES MATIÈRES', margin, y);
  y += 5;

  const toc = [
    ['1. États Financiers Officiels SCF (Bilan Actif/Passif & TCR I-X)', '2'],
    ['2. Ratios Financiers Simplifiés (Synthèse)', '4'],
    ['3. Équilibre Financier & Bilan Fonctionnel SCF', '5'],
    ['4. Compte de Résultat & Soldes Intermédiaires de Gestion (TCR)', '6'],
    ['5. Ratios Financiers, Solvabilité & Délais de Rotation', '7'],
    ['6. Analyse Comparative Pluriannuelle (N vs N-1)', '8'],
    ['7. Matrice des Risques & Notation de Solvabilité (Altman Z\'\')', '9'],
    ['8. Audit des Natures de Comptes & Anomalies d\'Écritures', '11'],
  ];

  toc.forEach(([title, pageNum]) => {
    doc.setFont('helvetica', 'normal');
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

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...T.navy);
    doc.text(pageNum, W - margin, y, { align: 'right' });
    y += 5;
  });

  // Bannière DONNÉES SIMULÉES
  if (isSimulated) {
    y += 4;
    doc.setFillColor(255, 237, 213);
    doc.rect(margin, y, W - margin * 2, 11, 'F');
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.6);
    doc.rect(margin, y, W - margin * 2, 11, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(154, 52, 18);
    doc.text(
      `ATTENTION : DONNEES SIMULEES${scenarioLabel ? ` — SCENARIO : ${scenarioLabel.toUpperCase()}` : ' (MODE WHAT-IF ACTIF)'} — NE PAS UTILISER POUR UN DEPOT OFFICIEL`,
      W / 2, y + 7, { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    y += 15;
  }

  // ──────────────────────────────────────────────────────────────────
  // PAGE 2 — SECTION 1 : ÉTATS FINANCIERS OFFICIELS SCF (ARRÊTÉ DU 26/07/2008)
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '1', 'États Financiers Officiels SCF (Arrêté du 26/07/2008)', y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...T.inkMuted);
  const scfIntro = doc.splitTextToSize(
    'Présentation conforme aux modèles officiels de Bilan et de Compte de Résultat du Système Comptable Financier (SCF) — à la différence du Bilan Fonctionnel (Section 3), de nature analytique.',
    W - margin * 2
  );
  doc.text(scfIntro, margin, y);
  y += scfIntro.length * 3.6 + 5;

  const an = bilanSCF.actifNonCourant || {};
  const ac = bilanSCF.actifCourant || {};
  const an1 = bScf1?.actifNonCourant || null;
  const ac1 = bScf1?.actifCourant || null;
  const netOf = (line) => line?.net || 0;
  const brutOf = (line) => line?.brut || 0;
  const amortOf = (line) => line?.amortProv || 0;
  // Amortissements/dépréciations affichés entre parenthèses (convention comptable de
  // présentation d'une déduction), même logique que l'écran États Financiers (SCF).
  const fmtAmort = (v) => (v ? `(${fmtDZD(v)})` : fmtDZD(0));
  // Total Brut/Amort./Net d'une section : somme de toutes ses rubriques hors la clé
  // "total" elle-même — même calcul que sumLines() dans EtatsFinanciersView.jsx, pour
  // que le PDF et l'écran affichent des totaux identiques.
  const sommeSection = (obj) => Object.keys(obj || {}).filter(k => k !== 'total').reduce((s, k) => {
    const l = obj[k] || {};
    return { brut: s.brut + (l.brut || 0), amortProv: s.amortProv + (l.amortProv || 0), net: s.net + (l.net || 0) };
  }, { brut: 0, amortProv: 0, net: 0 });

  const ancTotal = sommeSection(an);
  const ancTotal1 = an1 ? sommeSection(an1) : null;
  const acTotal = sommeSection(ac);
  const acTotal1 = ac1 ? sommeSection(ac1) : null;

  y = latexSubSection(doc, '1.1. Bilan Actif — Rubriques Officielles', y);

  // Ordre demandé : Brut N, puis Amort./Prov. N, puis Net N, puis Net N-1 — identique à
  // l'écran États Financiers (SCF) et au modèle officiel "BILAN ACTIF (présentation)".
  const actifHead = [['ACTIF', 'BRUT N', 'AMORT./PROV.', 'NET N', bScf1 ? 'NET N-1' : ''].filter(Boolean)];
  const actifRow = (label, line, line1) => [
    label,
    fmtDZD(brutOf(line)),
    fmtAmort(amortOf(line)),
    fmtDZD(netOf(line)),
    bScf1 ? fmtDZD(netOf(line1)) : '',
  ].filter((_, i) => bScf1 || i < 4);
  const actifTotalRow = (label, tot, tot1) => [
    label,
    fmtDZD(tot.brut),
    fmtAmort(tot.amortProv),
    fmtDZD(tot.net),
    bScf1 ? fmtDZD(tot1?.net || 0) : '',
  ].filter((_, i) => bScf1 || i < 4);
  const actifBody = [
    ['ACTIF NON COURANT', '', '', '', ''].filter((_, i) => bScf1 || i < 4),
    actifRow('Écart d\'acquisition (goodwill)', an.ecartAcquisition, an1?.ecartAcquisition),
    actifRow('Immobilisations incorporelles', an.immobilisationsIncorporelles, an1?.immobilisationsIncorporelles),
    actifRow('Terrains', an.terrains, an1?.terrains),
    actifRow('Bâtiments', an.batiments, an1?.batiments),
    actifRow('Autres immobilisations corporelles', an.autresImmoCorp, an1?.autresImmoCorp),
    actifRow('Immobilisations en concession', an.immobilisationsEnConcession, an1?.immobilisationsEnConcession),
    actifRow('Immobilisations en cours', an.immobilisationsEnCours, an1?.immobilisationsEnCours),
    actifRow('Immobilisations financières', an.immobilisationsFinancieres, an1?.immobilisationsFinancieres),
    actifRow('Impôts différés actif', an.impotsDifferesActif, an1?.impotsDifferesActif),
    actifTotalRow('TOTAL ACTIF NON COURANT', ancTotal, ancTotal1),
    ['ACTIF COURANT', '', '', '', ''].filter((_, i) => bScf1 || i < 4),
    actifRow('Stocks et en-cours', ac.stocks, ac1?.stocks),
    actifRow('Clients', ac.clients, ac1?.clients),
    actifRow('Autres débiteurs', ac.autresDebiteurs, ac1?.autresDebiteurs),
    actifRow('Impôts et assimilés', ac.impotsEtAssimilesActif, ac1?.impotsEtAssimilesActif),
    actifRow('Autres créances et emplois assimilés', ac.autresCreancesEmploisAssimiles, ac1?.autresCreancesEmploisAssimiles),
    actifRow('Placements et autres actifs financiers courants', ac.placements, ac1?.placements),
    actifRow('Trésorerie', ac.tresorerie, ac1?.tresorerie),
    actifTotalRow('TOTAL ACTIF COURANT', acTotal, acTotal1),
    actifTotalRow(
      'TOTAL GÉNÉRAL DE L\'ACTIF',
      { brut: ancTotal.brut + acTotal.brut, amortProv: ancTotal.amortProv + acTotal.amortProv, net: bilanSCF.totalActif || 0 },
      (ancTotal1 && acTotal1) ? { net: bScf1.totalActif || 0 } : null
    ),
  ];

  y = drawBooktabsTable(doc, actifHead, actifBody, y, {
    boldRows: [0, 10, 11, 19, 20],
    totalRowIndices: [10, 19],
    columnStyles: bScf1
      ? { 0: { cellWidth: 50 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
      : { 0: { cellWidth: 68 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
  });

  doc.addPage();
  y = 22;

  const cp = bilanSCF.capitauxPropres || {};
  const pnc = bilanSCF.passifNonCourant || {};
  const pc = bilanSCF.passifCourant || {};
  const cp1 = bScf1?.capitauxPropres || null;
  const pnc1 = bScf1?.passifNonCourant || null;
  const pc1 = bScf1?.passifCourant || null;
  const passifValRow = (label, val, val1) => [label, fmtDZD(val || 0), bScf1 ? fmtDZD(val1 || 0) : ''].filter((_, i) => bScf1 || i < 2);

  y = latexSubSection(doc, '1.2. Bilan Passif — Rubriques Officielles', y);

  const passifHead = [['PASSIF', 'NET N (DZD)', bScf1 ? 'NET N-1 (DZD)' : ''].filter(Boolean)];
  const passifBody = [
    ['CAPITAUX PROPRES', '', ''].filter((_, i) => bScf1 || i < 2),
    passifValRow('Capital émis', cp.capitalEmis, cp1?.capitalEmis),
    passifValRow('Capital non appelé (-)', cp.capitalNonAppele, cp1?.capitalNonAppele),
    passifValRow('Primes et réserves', cp.primesEtReserves, cp1?.primesEtReserves),
    passifValRow('Écarts de réévaluation', cp.ecartsReevaluation, cp1?.ecartsReevaluation),
    passifValRow('Résultat net', cp.resultatNet, cp1?.resultatNet),
    passifValRow('Résultat en instance d\'affectation', cp.resultatEnInstance, cp1?.resultatEnInstance),
    passifValRow('Autres capitaux propres — Report à nouveau', cp.autresCapitauxPropres, cp1?.autresCapitauxPropres),
    ['TOTAL I — CAPITAUX PROPRES', fmtDZD(cp.total || 0), bScf1 ? fmtDZD(cp1?.total || 0) : ''].filter((_, i) => bScf1 || i < 2),
    ['PASSIFS NON COURANTS', '', ''].filter((_, i) => bScf1 || i < 2),
    passifValRow('Emprunts et dettes financières', pnc.empruntsDettesFinancieres, pnc1?.empruntsDettesFinancieres),
    passifValRow('Impôts (différés et provisionnés)', pnc.impotsDifferesPassif, pnc1?.impotsDifferesPassif),
    passifValRow('Autres dettes non courantes', pnc.autresDettesNonCourantes, pnc1?.autresDettesNonCourantes),
    passifValRow('Provisions et produits constatés d\'avance', pnc.provisionsEtProduitsConstatesAvance, pnc1?.provisionsEtProduitsConstatesAvance),
    ['TOTAL II — PASSIFS NON COURANTS', fmtDZD(pnc.total || 0), bScf1 ? fmtDZD(pnc1?.total || 0) : ''].filter((_, i) => bScf1 || i < 2),
    ['PASSIFS COURANTS', '', ''].filter((_, i) => bScf1 || i < 2),
    passifValRow('Fournisseurs et comptes rattachés', pc.fournisseurs, pc1?.fournisseurs),
    passifValRow('Impôts', pc.impotsEtAssimilesPassif, pc1?.impotsEtAssimilesPassif),
    passifValRow('Autres dettes', pc.autresDettes, pc1?.autresDettes),
    passifValRow('Trésorerie passif', pc.tresoreriePassif, pc1?.tresoreriePassif),
    ['TOTAL III — PASSIFS COURANTS', fmtDZD(pc.total || 0), bScf1 ? fmtDZD(pc1?.total || 0) : ''].filter((_, i) => bScf1 || i < 2),
    ['TOTAL GÉNÉRAL DU PASSIF (I + II + III)', fmtDZD(bilanSCF.totalPassif || 0), bScf1 ? fmtDZD(bScf1.totalPassif || 0) : ''].filter((_, i) => bScf1 || i < 2),
  ];

  y = drawBooktabsTable(doc, passifHead, passifBody, y, {
    boldRows: [0, 7, 8, 13, 14, 19, 20],
    totalRowIndices: [7, 13, 19],
    columnStyles: bScf1
      ? { 0: { cellWidth: 100 }, 1: { halign: 'right' }, 2: { halign: 'right' } }
      : { 0: { cellWidth: 130 }, 1: { halign: 'right' } }
  });

  const ecartBilan = (bilanSCF.totalActif || 0) - (bilanSCF.totalPassif || 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...(Math.abs(ecartBilan) < 1 ? T.darkGreen : T.darkRed));
  doc.text(
    Math.abs(ecartBilan) < 1 ? '✓ Bilan équilibré (Total Actif = Total Passif)' : `⚠ Écart de balance détecté : ${fmtDZD(ecartBilan)}`,
    margin, y
  );
  y += 8;

  y = latexSubSection(doc, '1.3. Compte de Résultat par Nature — Numérotation Officielle (I à X)', y);

  const tcrRowsData = buildTCRRows(s);
  const tcrHead = [['CODE', 'RUBRIQUE', 'MONTANT N (DZD)']];
  const tcrBody = tcrRowsData.map(row => {
    const val = row.isCharge && row.val > 0 ? -row.val : (row.val || 0);
    return [row.code, row.label, fmtDZD(val)];
  });
  const tcrTotalIndices = tcrRowsData.reduce((acc, row, idx) => (row.type !== 'compte' ? [...acc, idx] : acc), []);

  y = drawBooktabsTable(doc, tcrHead, tcrBody, y, {
    boldRows: tcrTotalIndices,
    totalRowIndices: tcrTotalIndices,
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 110 }, 2: { halign: 'right' } }
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 4 — SECTION 2 : RATIOS FINANCIERS SIMPLIFIÉS (SYNTHÈSE)
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '2', 'Ratios Financiers Simplifiés (Synthèse)', y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...T.inkMuted);
  doc.text('Vue d\'ensemble condensée des indicateurs clés — le détail complet des formules et normes sectorielles figure en Section 5.', margin, y);
  y += 8;

  y = latexKpiRow(doc, [
    { label: 'Liquidité Générale', val: fmtNum(liqGen), sub: liqGen >= 1.2 ? 'Satisfaisante' : 'À surveiller', status: liqGen >= 1.0 ? 'ok' : 'danger' },
    { label: 'Autonomie Financière', val: fmtPct(autFinanc), sub: autFinanc >= 0.35 ? 'Bonne autonomie' : 'Dépendance aux dettes', status: autFinanc >= 0.25 ? 'ok' : 'danger' },
    { label: 'Marge Nette (RN / CA)', val: fmtPct(margeNette), sub: rn >= 0 ? 'Exercice bénéficiaire' : 'Exercice déficitaire', status: rn >= 0 ? 'ok' : 'danger' },
  ], y);

  y = latexKpiRow(doc, [
    { label: 'DSO — Délai Clients', val: fmtDays(dso), sub: dso <= 60 ? 'Recouvrement rapide' : 'Délai élevé', status: dso <= 60 ? 'ok' : 'danger' },
    { label: 'DPO — Délai Fournisseurs', val: fmtDays(dpo), sub: dpo >= 30 && dpo <= 75 ? 'Équilibré' : 'À ajuster', status: 'normal' },
    { label: 'Rotation des Stocks', val: fmtDays(rotStock), sub: rotStock <= 90 ? 'Vélocité satisfaisante' : 'Risque de surstockage', status: rotStock <= 90 ? 'ok' : 'danger' },
  ], y);

  // ──────────────────────────────────────────────────────────────────
  // PAGE 5 — SECTION 3 : ÉQUILIBRE FINANCIER & BILAN FONCTIONNEL
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '3', 'Équilibre Financier & Bilan Fonctionnel (SCF)', y);

  // Formule mathématique
  y = latexMathBox(
    doc,
    'FRNG = Ressources Stables - Emplois Stables     |     TN = FRNG - BFR',
    'Règle d\'or de l\'équilibre : Le Fonds de Roulement Net Global doit couvrir l\'intégralité du BFR d\'exploitation.',
    y,
    17
  );

  // Rangée KPI
  y = latexKpiRow(doc, [
    { label: 'FRNG (Ressources - Emplois)', val: fmtDZD(frng), sub: frng >= 0 ? 'Excédent structurel' : 'Déficit structurel', status: frng >= 0 ? 'ok' : 'danger' },
    { label: 'BFR (Besoin en Fonds de Roulement)', val: fmtDZD(bfr), sub: `${fmtDays(bfrJours)} de CA HT`, status: 'normal' },
    { label: 'Trésorerie Nette (TN)', val: fmtDZD(tn), sub: tn >= 0 ? 'Position de liquidité saine' : 'Recours aux concours CT', status: tn >= 0 ? 'ok' : 'danger' },
  ], y);

  y = latexSubSection(doc, '3.1. Tableau Synthétique des Masses Fonctionnelles', y);

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
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...T.inkMuted);
  doc.text('Note technique : Conformément aux normes SCF, les amortissements et pertes de valeur sont reclassés en ressources stables pour apprécier la capacité totale de financement.', margin, y);

  // ──────────────────────────────────────────────────────────────────
  // PAGE 6 — SECTION 4 : SIG & COMPTE DE RÉSULTAT (TCR)
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '4', 'Soldes Intermédiaires de Gestion (SIG / TCR SCF)', y);

  // Formule SIG
  y = latexMathBox(
    doc,
    'VA = Production - Consommations     |     EBE = VA - Personnel (63) - Impôts (64)',
    'Décomposition en cascade des agrégats de rentabilité selon la nomenclature officielle SCF.',
    y,
    17
  );

  y = latexKpiRow(doc, [
    { label: 'Chiffre d\'Affaires HT', val: fmtDZD(ca), sub: 'Production vendue', status: 'normal' },
    { label: 'Excédent Brut d\'Exploitation', val: fmtDZD(ebe), sub: `Marge EBE : ${fmtPct(margeEBE)}`, status: margeEBE >= 0.10 ? 'ok' : 'danger' },
    { label: 'Résultat Net de l\'Exercice', val: fmtDZD(rn), sub: `Marge Nette : ${fmtPct(margeNette)}`, status: rn >= 0 ? 'ok' : 'danger' },
  ], y);

  y = latexSubSection(doc, '4.1. Tableau des Comptes de Résultats (TCR Officiel)', y);

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
  // PAGE 7 — SECTION 5 : RATIOS FINANCIERS & DÉLAIS
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '5', 'Ratios Financiers, Solvabilité & Délais de Rotation', y);

  y = latexSubSection(doc, '5.1. Ratios de Liquidité, Solvabilité & Autonomie Financière', y);

  const liqHead = [['RATIO / INDICATEUR', 'FORMULE SCF', 'VALEUR N', 'NORME', 'APPRÉCIATION']];
  const liqRedVal = r.liquiditeReduite || 0;
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
      'Solvabilité Générale', 'Total Actif / Total Dettes Exigibles', solvabiliteVal > 0 ? fmtNum(solvabiliteVal) : '—', 'X > 1.50',
      solvabiliteVal <= 0 ? 'Non calculable' : solvabiliteVal >= 2.0 ? 'Solvable' : solvabiliteVal >= 1.5 ? 'Limite' : 'Risque d\'insolvabilité'
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

  y = latexSubSection(doc, '5.2. Ratios de Rentabilité Économique et Financière', y);

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

  y = latexSubSection(doc, '5.3. Délais de Rotation et Cycle d\'Exploitation (en Jours)', y);

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
  // PAGE 8 — SECTION 6 : COMPARATIF N vs N-1
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '6', 'Analyse Comparative Pluriannuelle (N vs N-1)', y);

  if (!dataN1) {
    y = latexMathBox(
      doc,
      'Exercice Comparatif N-1 : Non Fourni',
      'Pour activer l\'analyse comparative dynamique des flux et des soldes, veuillez importer la balance de l\'exercice N-1 dans l\'application.',
      y,
      20
    );
  } else {
    y = latexSubSection(doc, '6.1. Tableau des Variations Structurelles et de Rentabilité', y);

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
    y = latexSubSection(doc, '6.2. Synthèse de la Trajectoire Pluriannuelle', y);
    const caTrend = diffVal(ca, s1.chiffreAffaires) >= 0 ? 'croissance' : 'contraction';
    const frngTrend = diffVal(frng, b1.frng) >= 0 ? 'consolidation' : 'érosion';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...T.inkSecondary);
    const synthText = `L'exercice N est marqué par une dynamique de ${caTrend} de l'activité commerciale (${fmtPct(diffPct(ca, s1.chiffreAffaires))} de CA). Sur le plan structurel, on observe une ${frngTrend} du fonds de roulement (${fmtDZD(diffVal(frng, b1.frng))}), tandis que la trésorerie nette varie de ${fmtDZD(diffVal(tn, b1.tn))}. L'ajustement des charges d'exploitation et la gestion du BFR constituent les axes prioritaires pour préserver l'autonomie financière.`;
    const splitSynth = doc.splitTextToSize(synthText, W - margin * 2);
    doc.text(splitSynth, margin, y);
    y += splitSynth.length * 4.5 + 4;
  }

  // ──────────────────────────────────────────────────────────────────
  // PAGE 9 — SECTION 7 : DIAGNOSTIC & MATRICE DES RISQUES
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '7', 'Diagnostic Analytique & Matrice des Risques', y);

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
  y = latexSubSection(doc, '7.1. Plan d\'Action Recommandé aux Décideurs', y);

  const actions = [
    '1. Optimisation du BFR : Réduire le délai moyen d\'encaissement client (DSO) par des relances préventives et négocier l\'alignement des délais fournisseurs (DPO).',
    '2. Maîtrise des Charges d\'Exploitation : Suivre le ratio Charges de personnel / Valeur ajoutée pour maintenir un taux de marge d\'EBE supérieur à 12 %.',
    '3. Renforcement de la Structure Financière : Prioriser la mise en réserve intégrale des bénéfices distribuables pour accroître l\'autonomie financière.',
  ];

  actions.forEach(act => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...T.inkSecondary);
    doc.text(act, margin + 2, y);
    y += 5;
  });

  // ──────────────────────────────────────────────────────────────────
  // SECTION 7.2 — NOTATION DE SOLVABILITÉ (ALTMAN Z'' & BANQUE D'ALGÉRIE)
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSubSection(doc, '7.2. Notation de Solvabilité — Modèle Altman Z\'\' & Score Banque d\'Algérie', y);

  const solv = calculateAltmanZScore(bilan, sig, rows);

  y = latexMathBox(
    doc,
    "Z'' = 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4",
    "X1 = FRNG/Bilan · X2 = Réserves/Bilan · X3 = EBIT/Bilan · X4 = Capitaux Propres/Dettes — Modèle EM-Score (marchés émergents, entreprises non cotées)",
    y
  );

  y = latexKpiRow(doc, [
    {
      label: "SCORE ALTMAN Z''",
      val: solv.zScore.toFixed(2),
      sub: solv.zoneLabel.split('—')[0].trim(),
      status: solv.zone === 'safe' ? 'ok' : solv.zone === 'distress' ? 'danger' : 'warn'
    },
    {
      label: 'RATING SYNTHÉTIQUE',
      val: solv.rating,
      sub: `Niveau de risque : ${solv.risqueDefaillance}`,
      status: solv.zone === 'safe' ? 'ok' : solv.zone === 'distress' ? 'danger' : 'warn'
    },
    {
      label: "SCORE BANQUE D'ALGÉRIE",
      val: `${solv.bancaire.scoreBA.toFixed(1)} / 20`,
      sub: solv.bancaire.ratingBA,
      status: solv.bancaire.scoreBA >= 16 ? 'ok' : solv.bancaire.scoreBA >= 8 ? 'warn' : 'danger'
    }
  ], y);

  const detailsBA = solv.bancaire.detailsBA;
  const scoreHead = [['CRITÈRE (SUR 5 PTS)', 'RATIO OBSERVÉ', 'POINTS']];
  const scoreBody = [
    [detailsBA.autonomie.label, detailsBA.autonomie.displayVal, `${detailsBA.autonomie.score} / 5`],
    [detailsBA.rentabilite.label, detailsBA.rentabilite.displayVal, `${detailsBA.rentabilite.score} / 5`],
    [detailsBA.liquidite.label, detailsBA.liquidite.displayVal, `${detailsBA.liquidite.score} / 5`],
    [detailsBA.couverture.label, detailsBA.couverture.displayVal, `${detailsBA.couverture.score} / 5`],
  ];
  y = drawBooktabsTable(doc, scoreHead, scoreBody, y, {
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'center', cellWidth: 40 },
      2: { halign: 'center', fontStyle: 'bold', cellWidth: 30 }
    }
  });

  // Avertissement méthodologique — précision du modèle & estimation éventuelle
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(...T.inkMuted);
  const disclaimerLines = doc.splitTextToSize(
    solv.risqueDefaillanceDisclaimer +
    (solv.estimationPartielle ? ` ${solv.estimationPartielleMessage}` : ''),
    W - margin * 2
  );
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 3.6 + 4;

  // ──────────────────────────────────────────────────────────────────
  // PAGE 11 — SECTION 8 : AUDIT DES SOLDES & ANOMALIES SCF
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = 22;

  y = latexSection(doc, '8', 'Audit des Soldes & Conformité SCF', y);

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
        anomaliesList.push([c, r.libelle || 'Caisse', 'CAISSE CRÉDITRICE', 'Impossibilité matérielle', fmtDZD(sc)]);
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
    y = latexSubSection(doc, '8.1. Relevé Détaillé des Écritures et Soldes Inversés', y);

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
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...T.inkMuted);
      doc.text(`... et ${anomaliesList.length - 30} autres anomalies supplémentaires consultables dans l'onglet Audit Balance de la plateforme.`, margin, y);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // APPLICATION DES EN-TÊTES & PIEDS DE PAGE STYLE FANCYHDR
  // ──────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  applyLatexHeaderFooter(doc, totalPages, dossierName, 'N', badgeImg);

  // Téléchargement du fichier
  const cleanName = dossierName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const fileName = `BAIQ_Rapport_Financier_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}
