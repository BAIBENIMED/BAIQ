/* ═══════════════════════════════════════════════════════════
   BAIQ — Chargement différé des exportateurs (Excel & PDF)
   ═══════════════════════════════════════════════════════════

   Les deux générateurs d'export embarquent les bibliothèques les plus lourdes
   de l'application : xlsx pour le classeur Excel, jsPDF + jspdf-autotable +
   html2canvas pour le rapport PDF. Importés statiquement, ils partaient dans le
   bundle initial de TOUS les visiteurs — y compris ceux qui consultent un
   dossier sans jamais rien exporter, sur une connexion mobile.

   Ces deux passe-plats conservent exactement la signature d'origine : les
   composants appelants n'ont qu'à changer le chemin d'import, sans modifier
   leurs appels. Le module réel n'est téléchargé qu'au premier clic sur
   « Exporter », puis mis en cache par le navigateur.
*/

export async function exportFinancialWorkbook(...args) {
  const mod = await import('./excelExporter');
  return mod.exportFinancialWorkbook(...args);
}

export async function generateFullPDF(...args) {
  const mod = await import('./pdfExporter');
  return mod.generateFullPDF(...args);
}
