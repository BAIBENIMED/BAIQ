/* ═══════════════════════════════════════════════════════════
   BAIQ — Chargement différé des exportateurs (Excel & PDF)
   ═══════════════════════════════════════════════════════════

   Les deux générateurs d'export embarquent les bibliothèques les plus lourdes
   de l'application : xlsx pour le classeur Excel, jsPDF + jspdf-autotable +
   html2canvas pour le rapport PDF. Importés statiquement, ils partaient dans le
   bundle initial de TOUS les visiteurs — y compris ceux qui consultent un
   dossier sans jamais rien exporter, sur une connexion mobile.

   Ces passe-plats conservent exactement la signature d'origine : les
   composants appelants n'ont qu'à changer le chemin d'import, sans modifier
   leurs appels. Le module réel n'est téléchargé qu'au premier clic sur
   « Exporter », puis mis en cache par le navigateur.

   Un échec (module introuvable après un déploiement, données inattendues...) est
   annoncé à l'utilisateur par le bandeau d'erreur ; la promesse se résout alors à
   null, pour que l'appelant n'ait qu'à arrêter son indicateur de chargement.
*/
import { signalerErreur } from './erreurs';

export async function exportFinancialWorkbook(...args) {
  try {
    const mod = await import('./excelExporter');
    return await mod.exportFinancialWorkbook(...args);
  } catch (err) {
    signalerErreur("L'export Excel a échoué", err);
    return null;
  }
}

export async function generateFullPDF(...args) {
  try {
    const mod = await import('./pdfExporter');
    return await mod.generateFullPDF(...args);
  } catch (err) {
    signalerErreur("L'export PDF a échoué", err);
    return null;
  }
}

export async function generateRapportIAPDF(...args) {
  try {
    const mod = await import('./pdfExporter');
    return await mod.generateRapportIAPDF(...args);
  } catch (err) {
    signalerErreur('Le PDF du rapport IA a échoué', err);
    return null;
  }
}
