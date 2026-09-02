/**
 * Rend un élément non interactif (div, tr, td…) réellement actionnable au clavier.
 *
 * Un `<div onClick={...}>` n'est ni focusable, ni déclenchable par Entrée ou Espace :
 * il est invisible pour une navigation au clavier et pour un lecteur d'écran. Cette
 * fonction produit le jeu d'attributs minimal qui corrige les trois manques à la fois —
 * rôle annoncé, insertion dans l'ordre de tabulation, activation clavier.
 *
 * À réserver aux éléments véritablement actionnables (carte cliquable, ligne de tableau
 * ouvrant un détail). Ne PAS l'appliquer à un fond de modale servant à fermer au clic :
 * l'ajouter à l'ordre de tabulation piégerait l'utilisateur clavier sur une cible sans
 * signification — la touche Échap (cf. useEscapeKey) est la bonne réponse dans ce cas.
 *
 * @param {Function} onActivate  Action à exécuter au clic comme au clavier
 * @param {string}   [label]     Libellé annoncé si l'élément n'a pas de texte explicite
 *
 * @example
 *   <tr {...clickable(() => openDrillDown(r.label), `Détail de ${r.label}`)}>
 */
export function clickable(onActivate, label) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      // Espace fait défiler la page par défaut, Entrée peut soumettre un formulaire :
      // dans les deux cas on neutralise le comportement natif avant d'activer.
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    },
    ...(label ? { 'aria-label': label } : {}),
  };
}
