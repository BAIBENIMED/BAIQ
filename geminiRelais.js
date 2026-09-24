/**
 * Règles du relais /api/gemini (voir server.js), isolées pour être testées.
 *
 * Le relais n'accepte que la forme de requête produite par l'application et
 * reconstruit lui-même le corps envoyé à Google à partir des seuls champs
 * autorisés : tout le reste (instructions système, outils, pièces jointes,
 * options de génération non prévues) est refusé ou écarté, pour que la clé
 * serveur ne puisse pas servir de Gemini gratuit à un script tiers.
 */

// Modèles réellement appelés par l'application (aiEngine.js, AIView.jsx).
// gemini-2.0-flash et gemini-1.5-flash ont été retirés par Google.
export const MODELES_GEMINI_AUTORISES = new Set([
  'gemini-2.5-flash',
]);

// Le prompt légitime le plus long (contexte financier + question) fait moins de 10 000
// caractères ; la marge couvre un historique de conversation.
export const MAX_CARACTERES_PROMPT = 60_000;
export const MAX_JETONS_REPONSE = 4096;
const MAX_MESSAGES = 20;
const MAX_PARTIES_PAR_MESSAGE = 5;
const ROLES_AUTORISES = new Set(['user', 'model']);

/**
 * Valide une requête cliente et construit le corps à transmettre à Google.
 * @returns {{ modelName: string, corps: object } | { statut: number, erreur: string }}
 */
export function preparerRequeteGemini(requete) {
  const refus = (erreur) => ({ statut: 400, erreur });
  const { modelName, body } = requete || {};

  if (typeof modelName !== 'string' || !MODELES_GEMINI_AUTORISES.has(modelName)) {
    return refus('Modèle Gemini non autorisé.');
  }
  const contents = body?.contents;
  if (!Array.isArray(contents) || contents.length === 0 || contents.length > MAX_MESSAGES) {
    return refus('Requête invalide : contents doit contenir entre 1 et 20 messages.');
  }

  let totalCaracteres = 0;
  const contenusNettoyes = [];
  for (const message of contents) {
    const parts = message?.parts;
    if (!Array.isArray(parts) || parts.length === 0 || parts.length > MAX_PARTIES_PAR_MESSAGE) {
      return refus('Requête invalide : chaque message doit contenir entre 1 et 5 parties.');
    }
    if (message.role !== undefined && !ROLES_AUTORISES.has(message.role)) {
      return refus('Requête invalide : rôle de message non reconnu.');
    }
    const partsNettoyees = [];
    for (const part of parts) {
      const cles = part && typeof part === 'object' ? Object.keys(part) : [];
      if (cles.length !== 1 || cles[0] !== 'text' || typeof part.text !== 'string') {
        return refus('Requête invalide : seules les parties texte sont acceptées.');
      }
      totalCaracteres += part.text.length;
      partsNettoyees.push({ text: part.text });
    }
    contenusNettoyes.push(message.role ? { role: message.role, parts: partsNettoyees } : { parts: partsNettoyees });
  }
  if (totalCaracteres === 0 || totalCaracteres > MAX_CARACTERES_PROMPT) {
    return refus(`Requête invalide : le texte doit faire entre 1 et ${MAX_CARACTERES_PROMPT} caractères.`);
  }

  const config = body.generationConfig || {};
  const generationConfig = {
    maxOutputTokens: Math.min(
      Number.isInteger(config.maxOutputTokens) && config.maxOutputTokens > 0 ? config.maxOutputTokens : MAX_JETONS_REPONSE,
      MAX_JETONS_REPONSE
    ),
    // gemini-2.5-flash « réfléchit » par défaut et ces jetons sont pris sur
    // maxOutputTokens : sans cela, un rapport pourrait être tronqué.
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (typeof config.temperature === 'number' && config.temperature >= 0 && config.temperature <= 2) {
    generationConfig.temperature = config.temperature;
  }

  return { modelName, corps: { contents: contenusNettoyes, generationConfig } };
}

/**
 * Traduit une réponse d'erreur de Google en réponse du relais : un message en
 * français (jamais le corps brut de Google, qui peut exposer l'état du projet) et
 * un statut sans ambiguïté pour le client. Un 404 de Google (modèle retiré) devient
 * 502 : le client réserve le 404 au cas « relais non déployé ».
 */
export function traduireErreurGemini(statutGoogle, corpsGoogle) {
  const detail = typeof corpsGoogle?.error?.message === 'string' ? corpsGoogle.error.message : '';
  if (statutGoogle === 429) {
    return { statut: 429, erreur: 'Quota Gemini atteint côté Google. Réessayez dans quelques minutes.' };
  }
  if (statutGoogle === 404) {
    return { statut: 502, erreur: 'Ce modèle Gemini n\'est plus proposé par Google.' };
  }
  if (statutGoogle === 400 && /api key/i.test(detail)) {
    return { statut: 502, erreur: 'La clé Gemini configurée sur le serveur est refusée par Google.' };
  }
  if (statutGoogle === 401 || statutGoogle === 403) {
    return { statut: 502, erreur: 'La clé Gemini configurée sur le serveur n\'a pas accès à ce service.' };
  }
  return { statut: 502, erreur: `Le service Gemini a renvoyé une erreur (HTTP ${statutGoogle}).` };
}
