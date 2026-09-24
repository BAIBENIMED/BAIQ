/* ═══════════════════════════════════════════════════════════
   BAIQ — Signalement des erreurs à l'utilisateur
   ═══════════════════════════════════════════════════════════
   Toute erreur qui interrompt une action demandée (export, génération...) est
   annoncée dans le bandeau d'erreur de l'application (App.jsx) au lieu de
   rester dans la console, où l'utilisateur ne la voit jamais.
*/

export const EVENEMENT_ERREUR = 'baiq:erreur';

export function messageErreur(err) {
  const brut = String(err?.message || err || 'erreur inconnue');
  // Après un déploiement, les fichiers de l'ancienne version n'existent plus sur le
  // serveur : le chargement différé d'un module échoue tant que la page n'est pas rechargée.
  if (/dynamically imported module|Loading chunk|Importing a module script failed/i.test(brut)) {
    return "une nouvelle version de BAIQ a été mise en ligne : rechargez la page (F5) puis relancez l'action";
  }
  return brut;
}

export function signalerErreur(action, err) {
  console.error(`${action} :`, err);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENEMENT_ERREUR, { detail: `${action} : ${messageErreur(err)}.` }));
}
