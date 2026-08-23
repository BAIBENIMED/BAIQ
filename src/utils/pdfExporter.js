/* ═══════════════════════════════════════════════════════════════════════
   BAIQ — Exporteur PDF Global Structuré
   Utilise jsPDF + jspdf-autotable pour générer un rapport financier complet
   en format A4 professionnel (SCF Algérie)
   ═══════════════════════════════════════════════════════════════════════ */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Palette de couleurs BAIQ ──────────────────────────────────────────
const C = {
  navy:    [15, 23, 42],
  blue:    [37, 99, 235],
  blueLight: [219, 234, 254],
  green:   [5, 150, 105],
  greenLight: [209, 250, 229],
  red:     [220, 38, 38],
  redLight: [254, 226, 226],
  amber:   [217, 119, 6],
  amberLight: [254, 243, 199],
  slate:   [100, 116, 139],
  slateLight: [241, 245, 249],
  white:   [255, 255, 255],
  border:  [226, 232, 240],
};

// ── Helpers ──────────────────────────────────────────────────────────
const fmtNum  = (v) => Math.round(v || 0).toLocaleString('fr-FR') + ' DZD';
const fmtPct  = (v) => `${(v >= 0 ? '+' : '')}${((v || 0) * 100).toFixed(1)} %`;
const fmtRaw  = (v, d = 2) => isFinite(v) && v !== null && v !== undefined ? Number(v).toFixed(d) : '—';
const fmtDays = (v) => `${Math.round(v || 0)} jours`;
const safeDiv = (a, b) => (b && b !== 0 ? a / b : 0);

// ── Dessiner l'en-tête de page ────────────────────────────────────────
function drawPageHeader(doc, pageNum, totalPages, titre, profil) {
  const W = doc.internal.pageSize.getWidth();

  // Bande bleue en haut
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 22, 'F');

  // Logo texte BAIQ
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('BAIQ', 12, 14);

  // Sous-titre à gauche
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Balance & Analytics IQ — Analyse Financière SCF Algérie', 30, 14);

  // Titre du rapport centré
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(titre, W / 2, 14, { align: 'center' });

  // Page numéro à droite
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Page ${pageNum} / ${totalPages}`, W - 12, 14, { align: 'right' });

  // Ligne de séparation
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.4);
  doc.line(0, 22, W, 22);
}

// ── Dessiner le pied de page ──────────────────────────────────────────
function drawPageFooter(doc, profil) {
  const W  = doc.internal.pageSize.getWidth();
  const H  = doc.internal.pageSize.getHeight();
  const y  = H - 10;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(12, y - 3, W - 12, y - 3);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.slate);
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Généré le ${dateStr} — BAIQ Finance Platform — Données 100% locales`, 12, y);
  doc.text('Confidentiel — Usage interne uniquement', W - 12, y, { align: 'right' });
}

// ── Titre de section ──────────────────────────────────────────────────
function sectionTitle(doc, text, y, iconLetter = '■') {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.roundedRect(12, y, W - 24, 9, 1.5, 1.5, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(`${iconLetter}  ${text.toUpperCase()}`, 18, y + 6.2);
  return y + 14;
}

// ── Boîte KPI (3 par ligne) ───────────────────────────────────────────
function drawKpiBox(doc, x, y, w, label, value, sub, color = C.blue) {
  // Fond clair adapté à la couleur
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(x, y, w, 22, 2, 2, 'F');
  doc.setDrawColor(...color);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, 22, 2, 2, 'S');

  // Barre couleur gauche
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 3, 22, 1, 1, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.slate);
  doc.text(label.toUpperCase(), x + 6, y + 6);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(value, w - 8);
  doc.text(lines[0] || value, x + 6, y + 14);

  if (sub) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.slate);
    doc.text(sub, x + 6, y + 20);
  }
}

// ── Table utilitaire générique ────────────────────────────────────────
function drawTable(doc, head, body, startY, opts = {}) {
  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: 12, right: 12 },
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: C.navy,
      lineColor: C.border,
      lineWidth: 0.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: opts.columnStyles || {},
    didDrawPage: () => {},
    ...opts,
  });
  return doc.lastAutoTable.finalY + 8;
}

// ══════════════════════════════════════════════════════════════════════
//  FONCTION PRINCIPALE — generateFullPDF(data)
// ══════════════════════════════════════════════════════════════════════
export async function generateFullPDF(data) {
  const { bilan = {}, sig = {}, ratios = {}, rows = [], profil = {}, dataN1 } = data || {};
  const r = ratios;
  const s = sig;
  const b = bilan;
  const b1 = dataN1?.bilan || null;
  const s1 = dataN1?.sig || null;

  const secteurLabel = profil?.secteurId?.replace(/_/g, ' ') || 'Non défini';
  const nomDossier   = profil?.nomEntreprise || 'Dossier Anonyme';

  // Calculs utilitaires
  const margeEBE      = safeDiv(s.ebe, s.chiffreAffaires);
  const margeNette    = safeDiv(s.resultatNet, s.chiffreAffaires);
  const margeExploit  = safeDiv(s.resultatExploitation, s.chiffreAffaires);
  const tauxVA        = safeDiv(s.valeurAjoutee, s.chiffreAffaires);
  const autoFinanc    = r.autonomieFinanciere || 0;
  const liqGen        = r.liquiditeGenerale || 0;
  const couverture    = safeDiv(s.ebe, s.chargesFinancieres);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();

  // Estimation du nombre total de pages (approximatif pour l'en-tête)
  // On repassera après pour mettre à jour si besoin
  let totalPagesEstimate = 7;

  const addPage = (pageTitle) => {
    const pageNum = doc.internal.getNumberOfPages();
    drawPageHeader(doc, pageNum, '—', pageTitle, profil);
    drawPageFooter(doc, profil);
    return 30; // y de départ après l'en-tête
  };

  // ──────────────────────────────────────────────────────────────────
  // PAGE 1 — PAGE DE GARDE
  // ──────────────────────────────────────────────────────────────────
  // Fond haut dégradé
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 100, 'F');

  // Logo grand format
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.blue);
  doc.text('BAIQ', W / 2, 42, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Balance & Analytics IQ', W / 2, 52, { align: 'center' });

  // Ligne dorée
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1);
  doc.line(40, 58, W - 40, 58);

  // Titre du rapport
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('RAPPORT FINANCIER ANNUEL', W / 2, 72, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Analyse Complète — Système Comptable Financier (SCF)', W / 2, 80, { align: 'center' });
  doc.text('Algérie — Loi n° 07-11 / Décret exécutif 08-156', W / 2, 87, { align: 'center' });

  // Zone infos dossier
  let cy = 110;
  doc.setFillColor(...C.slateLight);
  doc.roundedRect(20, cy, W - 40, 65, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(20, cy, W - 40, 65, 3, 3, 'S');

  const infoItems = [
    ['Dossier / Raison Sociale', nomDossier],
    ['Secteur d\'Activité', secteurLabel],
    ['Effectif déclaré', profil?.effectif ? `${profil.effectif} personnes` : 'Non renseigné'],
    ['Chiffre d\'Affaires (N)', fmtNum(s.chiffreAffaires)],
    ['Résultat Net (N)', fmtNum(s.resultatNet)],
    ['Date de génération', new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
  ];

  infoItems.forEach(([label, value], i) => {
    const iy = cy + 10 + i * 9;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.slate);
    doc.text(label + ' :', 28, iy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.navy);
    doc.text(value, 100, iy);
  });

  // Avertissement confidentialité
  cy = 185;
  doc.setFillColor(...C.greenLight);
  doc.roundedRect(20, cy, W - 40, 18, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.green);
  doc.text('🔒  CONFIDENTIALITÉ & TRAITEMENT LOCAL DES DONNÉES', 28, cy + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text('Ce rapport a été généré localement dans votre navigateur. Aucune donnée comptable n\'a été transmise à un tiers.', 28, cy + 13);

  // Sections du rapport
  cy = 215;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('SOMMAIRE DU RAPPORT', W / 2, cy, { align: 'center' });
  cy += 6;

  const sommaire = [
    ['I.', 'Équilibre Financier & Bilan Fonctionnel', '2'],
    ['II.', 'Soldes Intermédiaires de Gestion (SIG — TCR)', '3'],
    ['III.', 'Ratios de Liquidité, Rentabilité & Activité', '4'],
    ['IV.', 'Comparatif N vs N-1 (Évolution pluriannuelle)', '5'],
    ['V.', 'Diagnostic Forces, Faiblesses & Risques', '6'],
    ['VI.', 'Audit des Soldes SCF & Anomalies Détectées', '7'],
  ];

  sommaire.forEach(([num, titre, pg], i) => {
    const sy = cy + i * 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.blue);
    doc.text(num, 28, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.navy);
    doc.text(titre, 38, sy);

    // Pointillés
    const dotStart = 38 + doc.getTextWidth(titre) + 3;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.setLineDash([1, 2]);
    doc.line(dotStart, sy - 1, W - 30, sy - 1);
    doc.setLineDash([]);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.blue);
    doc.text(pg, W - 25, sy, { align: 'right' });
  });

  // Footer page de garde
  drawPageFooter(doc, profil);

  // ──────────────────────────────────────────────────────────────────
  // PAGE 2 — ÉQUILIBRE FINANCIER & BILAN FONCTIONNEL
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  let y = addPage('I. Équilibre Financier & Bilan Fonctionnel');

  y = sectionTitle(doc, 'I. Équilibre Financier — FRNG, BFR, Trésorerie Nette', y);

  // 3 boîtes KPI côte à côte
  const kpiW = (W - 30) / 3;
  const frngColor = b.frng >= 0 ? C.green : C.red;
  const tnColor   = b.tn   >= 0 ? C.green : C.red;
  drawKpiBox(doc, 12,          y, kpiW - 2, 'FRNG — Fonds de Roulement Net Global', fmtNum(b.frng), b.frng >= 0 ? '✓ Excédent structurel' : '✗ Déficit structurel', frngColor);
  drawKpiBox(doc, 12 + kpiW,   y, kpiW - 2, 'BFR — Besoin en Fonds de Roulement',  fmtNum(b.bfr),  `${fmtDays(r.bfrJoursCA)} de CA`, C.amber);
  drawKpiBox(doc, 12 + kpiW*2, y, kpiW - 2, 'Trésorerie Nette (TN = FRNG - BFR)',  fmtNum(b.tn),   b.tn >= 0 ? '✓ Position saine' : '✗ Tension de liquidité', tnColor);
  y += 28;

  // Formules d'équilibre
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, y, W - 24, 22, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('FRNG = Ressources Stables − Emplois Stables', 18, y + 7);
  doc.text('BFR  = Actif Circulant − Passif Circulant', 18, y + 14);
  doc.text('TN   = FRNG − BFR  =  Trésorerie Active − Trésorerie Passive', 18, y + 21);
  y += 28;

  y = sectionTitle(doc, 'Décomposition du Bilan Fonctionnel (Emplois & Ressources)', y);

  const bilanHead = [['POSTE DU BILAN', 'EXERCICE N', b1 ? 'EXERCICE N-1' : '', b1 ? 'ÉVOLUTION' : ''].filter(Boolean)];
  const bilanBody = [
    ['ACTIF — EMPLOIS', '', b1 ? '' : '', b1 ? '' : ''].filter(Boolean),
    ['Emplois Stables (Immobilisations brutes)', fmtNum(b.emploisStables), b1 ? fmtNum(b1.emploisStables) : '', b1 ? fmtNum((b.emploisStables || 0) - (b1.emploisStables || 0)) : ''].filter(Boolean),
    ['Actif Circulant (Stocks + Créances)', fmtNum(b.actifCirculant), b1 ? fmtNum(b1.actifCirculant) : '', b1 ? fmtNum((b.actifCirculant || 0) - (b1.actifCirculant || 0)) : ''].filter(Boolean),
    ['Trésorerie Active (Disponibilités)', fmtNum(b.tresorerieActive), b1 ? fmtNum(b1.tresorerieActive) : '', b1 ? fmtNum((b.tresorerieActive || 0) - (b1.tresorerieActive || 0)) : ''].filter(Boolean),
    ['TOTAL ACTIF', fmtNum((b.emploisStables || 0) + (b.actifCirculant || 0) + (b.tresorerieActive || 0)), b1 ? fmtNum((b1.emploisStables || 0) + (b1.actifCirculant || 0) + (b1.tresorerieActive || 0)) : '', ''].filter(Boolean),
    ['PASSIF — RESSOURCES', '', b1 ? '' : '', ''].filter(Boolean),
    ['Ressources Stables (CP + Amort. + DLT)', fmtNum(b.ressourcesStables), b1 ? fmtNum(b1.ressourcesStables) : '', b1 ? fmtNum((b.ressourcesStables || 0) - (b1.ressourcesStables || 0)) : ''].filter(Boolean),
    ['Passif Circulant (Dettes CT)', fmtNum(b.passifCirculant), b1 ? fmtNum(b1.passifCirculant) : '', b1 ? fmtNum((b.passifCirculant || 0) - (b1.passifCirculant || 0)) : ''].filter(Boolean),
    ['Trésorerie Passive (Concours bancaires)', fmtNum(b.tresoreriePassive), b1 ? fmtNum(b1.tresoreriePassive) : '', b1 ? fmtNum((b.tresoreriePassive || 0) - (b1.tresoreriePassive || 0)) : ''].filter(Boolean),
  ];

  const colStyles = b1
    ? { 0: { halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    : { 0: { halign: 'left' }, 1: { halign: 'right' } };

  y = drawTable(doc, bilanHead, bilanBody, y, {
    columnStyles: colStyles,
    willDrawCell: (data) => {
      if (data.row.raw[0]?.includes('ACTIF') || data.row.raw[0]?.includes('PASSIF') || data.row.raw[0]?.includes('TOTAL')) {
        data.cell.styles.fillColor = C.navy;
        data.cell.styles.textColor = C.white;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 3 — SIG & TCR
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = addPage('II. Soldes Intermédiaires de Gestion (SIG — TCR)');

  y = sectionTitle(doc, 'II. Compte de Résultat & SIG — SCF Algérie', y);

  // 3 KPI rentabilité
  const kpiW2 = (W - 30) / 3;
  drawKpiBox(doc, 12,           y, kpiW2 - 2, "Chiffre d'Affaires HT", fmtNum(s.chiffreAffaires), 'Production totale vendue', C.blue);
  drawKpiBox(doc, 12 + kpiW2,   y, kpiW2 - 2, 'Excédent Brut d\'Exploitation', fmtNum(s.ebe), `Marge EBE : ${(margeEBE * 100).toFixed(1)}%`, margeEBE > 0.10 ? C.green : C.amber);
  drawKpiBox(doc, 12 + kpiW2*2, y, kpiW2 - 2, 'Résultat Net de l\'Exercice', fmtNum(s.resultatNet), `Marge nette : ${(margeNette * 100).toFixed(1)}%`, s.resultatNet >= 0 ? C.green : C.red);
  y += 28;

  const sigHead = [['SOLDE INTERMÉDIAIRE', 'MONTANT (N)', s1 ? 'MONTANT (N-1)' : '', s1 ? 'VARIATION' : ''].filter(Boolean)];
  const sigBody = [
    ["Chiffre d'Affaires (CA) — Comptes 70x", fmtNum(s.chiffreAffaires), s1 ? fmtNum(s1.chiffreAffaires) : '', s1 ? fmtNum((s.chiffreAffaires||0)-(s1.chiffreAffaires||0)) : ''].filter(Boolean),
    ['Production de l\'exercice (70+71+72)', fmtNum(s.productionExercice), s1 ? fmtNum(s1.productionExercice) : '', s1 ? fmtNum((s.productionExercice||0)-(s1.productionExercice||0)) : ''].filter(Boolean),
    ['Consommation de l\'exercice (60+61+62)', fmtNum(s.consommationExercice), s1 ? fmtNum(s1.consommationExercice) : '', ''].filter(Boolean),
    ['VALEUR AJOUTÉE (VA)', fmtNum(s.valeurAjoutee), s1 ? fmtNum(s1.valeurAjoutee) : '', s1 ? fmtNum((s.valeurAjoutee||0)-(s1.valeurAjoutee||0)) : ''].filter(Boolean),
    ['Charges de personnel (63x)', fmtNum(s.chargesPersonnel), s1 ? fmtNum(s1.chargesPersonnel) : '', ''].filter(Boolean),
    ['Impôts & taxes (64x)', fmtNum(s.impotsTaxes), s1 ? fmtNum(s1.impotsTaxes) : '', ''].filter(Boolean),
    ['EXCÉDENT BRUT D\'EXPLOITATION (EBE)', fmtNum(s.ebe), s1 ? fmtNum(s1.ebe) : '', s1 ? fmtNum((s.ebe||0)-(s1.ebe||0)) : ''].filter(Boolean),
    ['Dotations aux amortissements (68x)', fmtNum(s.dotationsAmortissements), s1 ? fmtNum(s1.dotationsAmortissements) : '', ''].filter(Boolean),
    ['RÉSULTAT D\'EXPLOITATION', fmtNum(s.resultatExploitation), s1 ? fmtNum(s1.resultatExploitation) : '', s1 ? fmtNum((s.resultatExploitation||0)-(s1.resultatExploitation||0)) : ''].filter(Boolean),
    ['Charges financières nettes (66x-76x)', fmtNum(s.chargesFinancieres), s1 ? fmtNum(s1.chargesFinancieres) : '', ''].filter(Boolean),
    ['RÉSULTAT AVANT IMPÔTS', fmtNum((s.resultatExploitation||0)-(s.chargesFinancieres||0)), s1 ? fmtNum((s1.resultatExploitation||0)-(s1.chargesFinancieres||0)) : '', ''].filter(Boolean),
    ['IBS & Impôts (695x)', fmtNum(s.impotsSurResultats), s1 ? fmtNum(s1.impotsSurResultats) : '', ''].filter(Boolean),
    ['RÉSULTAT NET DE L\'EXERCICE', fmtNum(s.resultatNet), s1 ? fmtNum(s1.resultatNet) : '', s1 ? fmtNum((s.resultatNet||0)-(s1.resultatNet||0)) : ''].filter(Boolean),
  ];

  y = drawTable(doc, sigHead, sigBody, y, {
    columnStyles: b1
      ? { 0: { halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
      : { 0: { halign: 'left' }, 1: { halign: 'right' } },
    willDrawCell: (data) => {
      const bold = ['VALEUR AJOUTÉE', 'EXCÉDENT BRUT', 'RÉSULTAT D\'EXPLOITATION', 'RÉSULTAT AVANT', 'RÉSULTAT NET'];
      if (bold.some(k => data.row.raw[0]?.startsWith(k))) {
        data.cell.styles.fillColor = C.navy;
        data.cell.styles.textColor = C.white;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 4 — RATIOS FINANCIERS
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = addPage('III. Ratios de Liquidité, Rentabilité & Activité');

  y = sectionTitle(doc, 'III-A. Ratios de Liquidité & Structure Financière', y);

  const liqHead = [['RATIO', 'VALEUR (N)', 'SEUIL CRITIQUE', 'NORME SECTORIELLE', 'INTERPRÉTATION']];
  const liqBody = [
    ['Liquidité Générale (AC / DCT)', fmtRaw(liqGen), '< 1.0', '≥ 1.2', liqGen >= 1.2 ? '✓ Satisfaisant' : liqGen >= 1.0 ? '△ Limite' : '✗ Insuffisant'],
    ['Liquidité Réduite (AC-Stocks / DCT)', fmtRaw(r.liquiditeReduite), '< 0.8', '≥ 1.0', (r.liquiditeReduite||0) >= 1.0 ? '✓ Satisfaisant' : '△ À surveiller'],
    ['Autonomie Financière (CP / Total)', `${((autoFinanc||0)*100).toFixed(1)} %`, '< 25 %', '≥ 35 %', (autoFinanc||0) >= 0.35 ? '✓ Bonne autonomie' : (autoFinanc||0) >= 0.25 ? '△ Acceptable' : '✗ Dépendance élevée'],
    ['Solvabilité Générale (Actif/Dettes)', fmtRaw(r.solvabilite), '< 1.5', '≥ 2.0', (r.solvabilite||0) >= 2.0 ? '✓ Solvable' : '△ À surveiller'],
    ['Couverture des Intérêts (EBE/ChgFin)', fmtRaw(couverture), '< 1.5x', '≥ 3.0x', couverture >= 3 ? '✓ Couverture aisée' : couverture >= 1.5 ? '△ Acceptable' : '✗ Risque de défaut'],
  ];
  y = drawTable(doc, liqHead, liqBody, y, {
    columnStyles: { 0: { halign: 'left', cellWidth: 65 }, 4: { halign: 'left' } }
  });

  y = sectionTitle(doc, 'III-B. Ratios de Rentabilité', y);
  const rentHead = [['RATIO', 'VALEUR (N)', 'INTERPRÉTATION']];
  const rentBody = [
    ['Marge EBE (EBE / CA)', `${(margeEBE*100).toFixed(1)} %`, margeEBE > 0.12 ? '✓ Excellent' : margeEBE > 0.07 ? '✓ Bon' : margeEBE > 0 ? '△ Faible' : '✗ Négatif'],
    ["Marge d'exploitation (RE / CA)", `${(margeExploit*100).toFixed(1)} %`, margeExploit > 0.08 ? '✓ Bon' : margeExploit > 0 ? '△ À améliorer' : '✗ Déficitaire'],
    ['Marge nette (RN / CA)', `${(margeNette*100).toFixed(1)} %`, margeNette > 0.05 ? '✓ Solide' : margeNette > 0 ? '△ Fragile' : '✗ Perte'],
    ["Taux de valeur ajoutée (VA / CA)", `${(tauxVA*100).toFixed(1)} %`, tauxVA > 0.35 ? '✓ Forte création de valeur' : '△ Activité de transformation'],
    ['Rentabilité économique (RE / Total Actif)', `${((r.rentabiliteEconomique||0)*100).toFixed(1)} %`, (r.rentabiliteEconomique||0) > 0.08 ? '✓ Bonne' : '△ À améliorer'],
  ];
  y = drawTable(doc, rentHead, rentBody, y, {
    columnStyles: { 0: { halign: 'left', cellWidth: 80 }, 2: { halign: 'left' } }
  });

  y = sectionTitle(doc, 'III-C. Ratios d\'Activité & Délais de Rotation (en jours)', y);
  const actHead = [['INDICATEUR', 'VALEUR (N)', 'NORME', 'STATUT']];
  const dso = r.delaiRecouvrement || 0;
  const dpo = r.delaiFournisseurs || 0;
  const rot = r.rotationStocks || 0;
  const actBody = [
    ['DSO — Délai de recouvrement clients', fmtDays(dso), '≤ 60 j', dso <= 60 ? '✓ Bon' : dso <= 90 ? '△ Limite' : '✗ Trop long'],
    ['DPO — Délai de règlement fournisseurs', fmtDays(dpo), '30–75 j', (dpo >= 30 && dpo <= 75) ? '✓ Correct' : '△ À vérifier'],
    ['Rotation des stocks', fmtDays(rot), '≤ 90 j', rot <= 90 ? '✓ Rapide' : rot <= 150 ? '△ Moyen' : '✗ Lent'],
    ['BFR en jours de CA', fmtDays(r.bfrJoursCA), '≤ 60 j', (r.bfrJoursCA||0) <= 60 ? '✓ Maîtrisé' : '△ À optimiser'],
    ['Taux de rotation des stocks (x/an)', `${(r.tauxRotationStocks||0).toFixed(2)} x`, '≥ 4 x/an', (r.tauxRotationStocks||0) >= 4 ? '✓ Bonne vélocité' : '△ Lent'],
  ];
  y = drawTable(doc, actHead, actBody, y, {
    columnStyles: { 0: { halign: 'left', cellWidth: 80 }, 3: { halign: 'left' } }
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 5 — COMPARATIF N vs N-1
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = addPage('IV. Comparatif Pluriannuel N vs N-1');

  y = sectionTitle(doc, 'IV. Analyse Comparative N vs N-1 — Évolution des Indicateurs Clés', y);

  if (!dataN1) {
    doc.setFillColor(...C.amberLight);
    doc.roundedRect(12, y, W - 24, 16, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.amber);
    doc.text('⚠  Balance N-1 non importée — Importez la balance de l\'exercice précédent pour activer l\'analyse comparative.', 18, y + 9);
    y += 22;
  } else {
    const compHead = [['INDICATEUR', 'N', 'N-1', 'VARIATION (DA)', 'VAR. (%)']];
    const pct = (n, n1) => n1 && n1 !== 0 ? `${(((n - n1) / Math.abs(n1)) * 100).toFixed(1)} %` : '—';
    const diff = (n, n1) => {
      const d = (n || 0) - (n1 || 0);
      return (d > 0 ? '+' : '') + Math.round(d).toLocaleString('fr-FR') + ' DZD';
    };

    const compBody = [
      ["Chiffre d'Affaires", fmtNum(s.chiffreAffaires), fmtNum(s1?.chiffreAffaires), diff(s.chiffreAffaires, s1?.chiffreAffaires), pct(s.chiffreAffaires, s1?.chiffreAffaires)],
      ['Valeur Ajoutée', fmtNum(s.valeurAjoutee), fmtNum(s1?.valeurAjoutee), diff(s.valeurAjoutee, s1?.valeurAjoutee), pct(s.valeurAjoutee, s1?.valeurAjoutee)],
      ['EBE', fmtNum(s.ebe), fmtNum(s1?.ebe), diff(s.ebe, s1?.ebe), pct(s.ebe, s1?.ebe)],
      ['Résultat d\'Exploitation', fmtNum(s.resultatExploitation), fmtNum(s1?.resultatExploitation), diff(s.resultatExploitation, s1?.resultatExploitation), pct(s.resultatExploitation, s1?.resultatExploitation)],
      ['Résultat Net', fmtNum(s.resultatNet), fmtNum(s1?.resultatNet), diff(s.resultatNet, s1?.resultatNet), pct(s.resultatNet, s1?.resultatNet)],
      ['FRNG', fmtNum(b.frng), fmtNum(b1?.frng), diff(b.frng, b1?.frng), pct(b.frng, b1?.frng)],
      ['BFR', fmtNum(b.bfr), fmtNum(b1?.bfr), diff(b.bfr, b1?.bfr), pct(b.bfr, b1?.bfr)],
      ['Trésorerie Nette', fmtNum(b.tn), fmtNum(b1?.tn), diff(b.tn, b1?.tn), pct(b.tn, b1?.tn)],
      ['Liquidité Générale', fmtRaw(r.liquiditeGenerale), fmtRaw(dataN1?.ratios?.liquiditeGenerale), '—', '—'],
      ['Marge EBE (%)', `${(margeEBE*100).toFixed(1)}%`, `${(safeDiv(s1?.ebe, s1?.chiffreAffaires)*100).toFixed(1)}%`, '—', '—'],
      ['Marge nette (%)', `${(margeNette*100).toFixed(1)}%`, `${(safeDiv(s1?.resultatNet, s1?.chiffreAffaires)*100).toFixed(1)}%`, '—', '—'],
    ];

    y = drawTable(doc, compHead, compBody, y, {
      columnStyles: { 0: { halign: 'left', cellWidth: 55 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // PAGE 6 — DIAGNOSTIC FORCES / FAIBLESSES / RISQUES
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = addPage('V. Diagnostic — Forces, Faiblesses & Risques');

  y = sectionTitle(doc, 'V. Diagnostic Financier — Analyse des Forces & Faiblesses (SCF)', y);

  const diagnostics = [];

  // FRNG
  diagnostics.push({ type: b.frng >= 0 ? 'FORCE' : 'FAIBLESSE', cat: 'Équilibre financier', titre: b.frng >= 0 ? 'FRNG positif — Structure solide' : 'FRNG négatif — Déséquilibre structurel', detail: b.frng >= 0 ? `FRNG = ${fmtNum(b.frng)} : les ressources stables couvrent intégralement les emplois stables.` : `FRNG = ${fmtNum(b.frng)} : des emplois stables sont financés par des ressources CT — risque structurel.` });
  // Trésorerie
  diagnostics.push({ type: b.tn >= 0 ? 'FORCE' : 'RISQUE', cat: 'Liquidité', titre: b.tn >= 0 ? 'Trésorerie nette positive' : 'Trésorerie nette négative — Tension', detail: b.tn >= 0 ? `TN = ${fmtNum(b.tn)} : position de liquidité saine.` : `TN = ${fmtNum(b.tn)} : recours aux concours bancaires CT — surveiller le coût du découvert.` });
  // Rentabilité
  diagnostics.push({ type: margeNette > 0.05 ? 'FORCE' : margeNette > 0 ? 'NEUTRE' : 'FAIBLESSE', cat: 'Rentabilité', titre: margeNette > 0.05 ? 'Rentabilité nette solide (> 5%)' : margeNette > 0 ? 'Marge nette positive mais fragile' : 'Résultat net déficitaire', detail: `Marge nette = ${(margeNette*100).toFixed(1)}% — RN = ${fmtNum(s.resultatNet)}` });
  // EBE
  diagnostics.push({ type: margeEBE > 0.10 ? 'FORCE' : margeEBE > 0 ? 'NEUTRE' : 'RISQUE', cat: 'EBE', titre: margeEBE > 0.10 ? 'EBE satisfaisant (> 10%)' : margeEBE > 0 ? 'EBE positif mais insuffisant' : 'EBE négatif — Activité non rentable', detail: `Marge EBE = ${(margeEBE*100).toFixed(1)}% — EBE = ${fmtNum(s.ebe)}` });
  // DSO
  if (dso > 90) diagnostics.push({ type: 'FAIBLESSE', cat: 'Recouvrement', titre: 'DSO excessif — Risque crédit clients', detail: `Délai de recouvrement = ${fmtDays(dso)} — norme ≤ 60 j. Risque de trésorerie.` });
  else diagnostics.push({ type: 'FORCE', cat: 'Recouvrement', titre: 'DSO maîtrisé', detail: `Délai de recouvrement = ${fmtDays(dso)} — dans les normes sectorielles.` });
  // Autonomie
  if (autoFinanc < 0.25) diagnostics.push({ type: 'RISQUE', cat: 'Structure', titre: 'Faible autonomie financière (< 25%)', detail: `CP / Total Passif = ${(autoFinanc*100).toFixed(1)}% — dépendance forte aux dettes.` });
  else diagnostics.push({ type: 'FORCE', cat: 'Structure', titre: `Bonne autonomie financière (${(autoFinanc*100).toFixed(1)}%)`, detail: `Capitaux propres représentent ${(autoFinanc*100).toFixed(1)}% du passif total.` });

  const colorMap = { FORCE: [5, 150, 105], FAIBLESSE: [220, 38, 38], RISQUE: [217, 119, 6], NEUTRE: [100, 116, 139] };
  const bgMap    = { FORCE: [209, 250, 229], FAIBLESSE: [254, 226, 226], RISQUE: [254, 243, 199], NEUTRE: [241, 245, 249] };
  const prefix   = { FORCE: '✓', FAIBLESSE: '✗', RISQUE: '△', NEUTRE: '→' };

  diagnostics.forEach((d) => {
    if (y > H - 40) { doc.addPage(); y = addPage('V. Diagnostic (suite)'); }
    const col = colorMap[d.type];
    const bg  = bgMap[d.type];
    doc.setFillColor(...bg);
    doc.roundedRect(12, y, W - 24, 22, 2, 2, 'F');
    doc.setDrawColor(...col);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, y, W - 24, 22, 2, 2, 'S');
    doc.setFillColor(...col);
    doc.roundedRect(12, y, 4, 22, 1, 1, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...col);
    doc.text(`${prefix[d.type]} ${d.type} — ${d.cat}`, 20, y + 7);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    doc.text(d.titre, 20, y + 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.slate);
    const lines = doc.splitTextToSize(d.detail, W - 38);
    doc.text(lines[0], 20, y + 20);

    y += 27;
  });

  // ──────────────────────────────────────────────────────────────────
  // PAGE 7 — AUDIT DES SOLDES SCF
  // ──────────────────────────────────────────────────────────────────
  doc.addPage();
  y = addPage('VI. Audit des Soldes SCF & Anomalies');

  y = sectionTitle(doc, 'VI. Audit des Soldes — Anomalies Détectées (Règles SCF Algérie)', y);

  const anomalies = [];
  if (rows && rows.length > 0) {
    // Règles d'audit rapides SCF
    rows.forEach(row => {
      if (!row || !row.compte || row.ignore) return;
      const c   = row.compte.toString().trim();
      const cl  = c[0];
      const p2  = c.slice(0, 2);
      const p3  = c.slice(0, 3);
      const sd  = Math.abs(row.soldeFinDebit  || 0);
      const sc  = Math.abs(row.soldeFinCredit || 0);
      const isD = sd > 0.01 && sc < 0.01;
      const isC = sc > 0.01 && sd < 0.01;

      // Classe 1 hors 12/13 → créditeurs
      if (cl === '1' && !['12','13'].includes(p2) && isD)
        anomalies.push([c, row.libelle || '', 'DÉBITEUR ANORMAL', `Cp./réserves/emprunts doit être créditeur`, Math.round(sd).toLocaleString('fr-FR')]);
      // Classe 5 caisse
      if (['531','532','533','534'].includes(p3) && isC)
        anomalies.push([c, row.libelle || '', 'CAISSE CRÉDITRICE', '⚠ Impossible physiquement — erreur de saisie', Math.round(sc).toLocaleString('fr-FR')]);
      // Fournisseur débiteur (hors 409)
      if (p2 === '40' && !['406','409'].includes(p3) && isD)
        anomalies.push([c, row.libelle || '', 'FOURNISSEUR DÉBITEUR', 'Normalement créditeur (acompte ou trop-payé ?)', Math.round(sd).toLocaleString('fr-FR')]);
      // Client créditeur (hors 419)
      if (p2 === '41' && p3 !== '419' && isC)
        anomalies.push([c, row.libelle || '', 'CLIENT CRÉDITEUR', 'Normalement débiteur (avoir non imputé ?)', Math.round(sc).toLocaleString('fr-FR')]);
      // Compte 47 non soldé
      if (p2 === '47' && (sd + sc) > 0.01)
        anomalies.push([c, row.libelle || '', 'COMPTE ATTENTE', 'Compte 47x doit être soldé en fin de période', Math.round(sd + sc).toLocaleString('fr-FR')]);
      // Classe 6 créditrice (hors 609)
      if (cl === '6' && p3 !== '609' && isC)
        anomalies.push([c, row.libelle || '', 'CHARGE CRÉDITRICE', 'Compte de charge doit être débiteur', Math.round(sc).toLocaleString('fr-FR')]);
      // Classe 7 débitrice (hors 709)
      if (cl === '7' && p3 !== '709' && isD)
        anomalies.push([c, row.libelle || '', 'PRODUIT DÉBITEUR', 'Compte de produit doit être créditeur', Math.round(sd).toLocaleString('fr-FR')]);
    });
  }

  if (anomalies.length === 0) {
    doc.setFillColor(...C.greenLight);
    doc.roundedRect(12, y, W - 24, 18, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.green);
    doc.text('✓  Aucune anomalie détectée — Tous les soldes sont conformes aux règles SCF Algérie.', 20, y + 11);
    y += 24;
  } else {
    const auditHead = [['COMPTE', 'LIBELLÉ', 'TYPE ANOMALIE', 'EXPLICATION', 'MONTANT (DZD)']];
    y = drawTable(doc, auditHead, anomalies.slice(0, 40), y, {
      columnStyles: {
        0: { halign: 'left', cellWidth: 18 },
        1: { halign: 'left', cellWidth: 45 },
        2: { halign: 'left', cellWidth: 30 },
        3: { halign: 'left' },
        4: { halign: 'right', cellWidth: 28 },
      },
      willDrawCell: (data) => {
        if (data.column.index === 2) {
          const t = data.cell.text[0] || '';
          if (t.includes('CAISSE') || t.includes('ANORMAL')) data.cell.styles.textColor = C.red;
          else data.cell.styles.textColor = C.amber;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    if (anomalies.length > 40) {
      doc.setFontSize(7.5);
      doc.setTextColor(...C.slate);
      doc.text(`... et ${anomalies.length - 40} autres anomalies non affichées. Voir onglet Audit Balance dans l'application.`, 12, y);
    }
  }

  // Résumé statistique
  y += 6;
  doc.setFillColor(...C.slateLight);
  doc.roundedRect(12, y, W - 24, 18, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text(`Statistiques de la balance : ${rows.length} lignes importées  ·  ${anomalies.length} anomalie(s) détectée(s)  ·  Score conformité : ${Math.round(((rows.length - anomalies.length) / Math.max(rows.length, 1)) * 100)} %`, 20, y + 10);

  // ──────────────────────────────────────────────────────────────────
  // MISE À JOUR DES EN-TÊTES avec le bon nombre de pages
  // ──────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  const pageTitles = [
    'Rapport Financier Annuel — BAIQ',
    'I. Équilibre Financier & Bilan Fonctionnel',
    'II. Soldes Intermédiaires de Gestion (SIG — TCR)',
    'III. Ratios de Liquidité, Rentabilité & Activité',
    'IV. Comparatif Pluriannuel N vs N-1',
    'V. Diagnostic — Forces, Faiblesses & Risques',
    'VI. Audit des Soldes SCF & Anomalies',
  ];

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Récrire le numéro de page dans l'en-tête (hors page de garde)
    if (p > 1) {
      doc.setFillColor(...C.navy);
      doc.rect(W - 40, 0, 40, 22, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${p} / ${totalPages}`, W - 12, 14, { align: 'right' });
    }
  }

  // ── Sauvegarder le PDF ────────────────────────────────────────────
  const fileName = `BAIQ_Rapport_Financier_${nomDossier.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
  return fileName;
}
