/* ═══════════════════════════════════════════════════════════
   BAIQ — Lecture du Markdown des rapports IA
   ═══════════════════════════════════════════════════════════
   Règles de découpage partagées par l'affichage à l'écran (ReportsView) et par
   l'export PDF du rapport (pdfExporter) : un même texte donne les mêmes titres,
   listes et tableaux dans les deux rendus.
*/

// Symboles que le modèle écrit parfois en LaTeX ($\ge$, $\times$…) : affichés en clair.
// Ordre significatif : \geq avant \ge, \leq avant \le.
const LATEX_EN_CLAIR = [['\\geq', '≥'], ['\\ge', '≥'], ['\\leq', '≤'], ['\\le', '≤'], ['\\times', '×'],
  ['\\approx', '≈'], ['\\neq', '≠'], ['\\rightarrow', '→'], ['\\%', '%']];

export const nettoyerLatex = (texte) => texte.replace(/\$([^$\n]{1,60})\$/g, (_, formule) =>
  LATEX_EN_CLAIR.reduce((s, [code, symbole]) => s.split(code).join(symbole), formule).replace(/[{}\\]/g, '').trim());

// Niveau d'imbrication d'une ligne de liste d'après son indentation (2 ou 4 espaces selon le modèle).
export const niveauListe = (ligne) => {
  const indentation = (ligne.match(/^\s*/)[0] || '').replace(/\t/g, '    ').length;
  return indentation >= 6 ? 2 : indentation >= 2 ? 1 : 0;
};

/** Cellules d'une ligne de tableau « | a | b | » (bordures extérieures retirées). */
export const cellulesTableau = (ligne) => ligne.split('|').map(s => s.trim())
  .filter((s, i, a) => (i > 0 && i < a.length - 1) || (a.length <= 2 && s));

/**
 * Découpe le texte en blocs typés :
 * { type: 'titre', niveau, texte } · { type: 'paragraphe', texte } · { type: 'citation', texte }
 * { type: 'liste', niveau, marque, ordonnee, texte } · { type: 'tableau', entete, lignes }
 * { type: 'separateur' } · { type: 'vide' }
 */
export function decouperMarkdown(texte) {
  const blocs = [];
  let tableau = [];
  const viderTableau = () => {
    if (tableau.length === 0) return;
    blocs.push({ type: 'tableau', entete: cellulesTableau(tableau[0]), lignes: tableau.slice(1).map(cellulesTableau) });
    tableau = [];
  };

  String(texte || '').split('\n').forEach((ligne) => {
    const brute = ligne.trim();
    if (brute.startsWith('|') && brute.endsWith('|')) {
      if (!/^\|[\s:|-]+\|$/.test(brute)) tableau.push(brute); // la ligne « |---|---| » est ignorée
      return;
    }
    viderTableau();

    if (!brute) { blocs.push({ type: 'vide' }); return; }
    if (/^(-{3,}|\*{3,})$/.test(brute)) { blocs.push({ type: 'separateur' }); return; }

    const titre = brute.match(/^(#{1,4})\s+(.*)$/);
    if (titre) { blocs.push({ type: 'titre', niveau: titre[1].length, texte: titre[2] }); return; }

    if (brute.startsWith('>')) { blocs.push({ type: 'citation', texte: brute.replace(/^>\s?/, '') }); return; }

    const numerote = brute.match(/^(\d+)[.)]\s+(.*)$/);
    const puce = brute.match(/^([-*•✓✗])\s+(.*)$/);
    if (numerote || puce) {
      const niveau = niveauListe(ligne);
      blocs.push({
        type: 'liste',
        niveau,
        ordonnee: Boolean(numerote),
        marque: numerote ? `${numerote[1]}.` : ['✓', '✗'].includes(puce[1]) ? puce[1] : ['•', '◦', '▪'][niveau],
        texte: numerote ? numerote[2] : puce[2],
      });
      return;
    }

    blocs.push({ type: 'paragraphe', texte: brute });
  });
  viderTableau();
  return blocs;
}

/** Découpe une ligne en segments { texte, gras, italique } (**gras**, *italique*). */
export function segmentsEnLigne(texte) {
  return nettoyerLatex(String(texte || ''))
    .split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)
    .filter(Boolean)
    .map((partie) => {
      if (partie.startsWith('**') && partie.endsWith('**') && partie.length > 4) return { texte: partie.slice(2, -2), gras: true, italique: false };
      if (partie.startsWith('*') && partie.endsWith('*') && partie.length > 2) return { texte: partie.slice(1, -1), gras: false, italique: true };
      return { texte: partie, gras: false, italique: false };
    });
}

/** Texte sans marques Markdown (cellules de tableau, titres). */
export const texteBrut = (texte) => segmentsEnLigne(texte).map(s => s.texte).join('');

// Les polices intégrées de jsPDF n'encodent que le jeu Windows-1252 : tout autre caractère
// (≥, →, émojis…) sortirait en signes illisibles dans le PDF. On le remplace par un
// équivalent lisible, ou on le retire s'il est purement décoratif.
const EQUIVALENTS_WINANSI = {
  '≥': '>=', '≤': '<=', '≠': '!=', '≈': '~', '→': '->', '←': '<-', '⇒': '=>', '↑': '+', '↓': '-',
  '−': '-', '◦': '-', '▪': '-', '✓': '', '✔': '', '✗': '', '✘': '', 'Δ': 'Var. ',
  ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
};
const SPECIAUX_WINANSI = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const estWinAnsi = (c) => {
  const code = c.codePointAt(0);
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || SPECIAUX_WINANSI.includes(c) || c === '\n';
};

// Pas de trim : appliquée segment par segment, elle doit garder l'espace qui sépare un
// passage en gras du texte qui l'entoure.
export function versWinAnsi(texte) {
  return Array.from(String(texte ?? ''))
    .map(c => (c in EQUIVALENTS_WINANSI ? EQUIVALENTS_WINANSI[c] : estWinAnsi(c) ? c : ''))
    .join('')
    .replace(/ {2,}/g, ' ');
}
