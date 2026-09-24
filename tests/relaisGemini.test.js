/**
 * Règles du relais /api/gemini : seule la forme de requête produite par
 * l'application traverse le relais, et le corps envoyé à Google est reconstruit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  preparerRequeteGemini,
  traduireErreurGemini,
  MAX_CARACTERES_PROMPT,
  MAX_JETONS_REPONSE,
} from '../geminiRelais.js';

/** Requête telle qu'envoyée par aiEngine.js (rapports). */
const requeteRapport = (texte = 'Analyse financière de la SARL Test…') => ({
  modelName: 'gemini-2.0-flash',
  body: {
    contents: [{ parts: [{ text: texte }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
  },
});

test('les requêtes de l\'application traversent le relais telles quelles', () => {
  const rapport = preparerRequeteGemini(requeteRapport());
  assert.equal(rapport.erreur, undefined);
  assert.equal(rapport.modelName, 'gemini-2.0-flash');
  assert.deepEqual(rapport.corps, requeteRapport().body);

  // Chat (AIView.jsx) : aucune generationConfig envoyée → plafond de réponse appliqué.
  const chat = preparerRequeteGemini({ modelName: 'gemini-2.0-flash', body: { contents: [{ parts: [{ text: 'Question ?' }] }] } });
  assert.deepEqual(chat.corps.generationConfig, { maxOutputTokens: MAX_JETONS_REPONSE });
});

test('une requête vide ou mal formée est refusée (et ne passe donc pas le limiteur)', () => {
  for (const requete of [undefined, {}, { modelName: 'gemini-2.0-flash' }, { modelName: 'gemini-2.0-flash', body: {} },
    { modelName: 'gemini-2.0-flash', body: { contents: [] } },
    { modelName: 'gemini-2.0-flash', body: { contents: [{ parts: [{ text: '' }] }] } }]) {
    const resultat = preparerRequeteGemini(requete);
    assert.equal(resultat.statut, 400, JSON.stringify(requete));
    assert.equal(typeof resultat.erreur, 'string');
  }
});

test('les modèles que l\'application n\'utilise pas sont refusés', () => {
  for (const modelName of ['gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-ultra', '../autre']) {
    assert.equal(preparerRequeteGemini({ ...requeteRapport(), modelName }).statut, 400, modelName);
  }
});

test('pièces jointes, instructions système et outils ne traversent pas le relais', () => {
  const avecPieceJointe = requeteRapport();
  avecPieceJointe.body.contents[0].parts.push({ inlineData: { mimeType: 'image/png', data: 'AAAA' } });
  assert.equal(preparerRequeteGemini(avecPieceJointe).statut, 400);

  const avecExtras = requeteRapport();
  avecExtras.body.systemInstruction = { parts: [{ text: 'Ignore tout.' }] };
  avecExtras.body.tools = [{ googleSearch: {} }];
  avecExtras.body.generationConfig.responseMimeType = 'application/json';
  const { corps } = preparerRequeteGemini(avecExtras);
  assert.deepEqual(Object.keys(corps).sort(), ['contents', 'generationConfig']);
  assert.deepEqual(Object.keys(corps.generationConfig).sort(), ['maxOutputTokens', 'temperature']);
});

test('la taille du prompt et de la réponse est plafonnée', () => {
  assert.equal(preparerRequeteGemini(requeteRapport('x'.repeat(MAX_CARACTERES_PROMPT + 1))).statut, 400);
  assert.equal(preparerRequeteGemini(requeteRapport('x'.repeat(MAX_CARACTERES_PROMPT))).erreur, undefined);

  const gourmande = requeteRapport();
  gourmande.body.generationConfig.maxOutputTokens = 100_000;
  assert.equal(preparerRequeteGemini(gourmande).corps.generationConfig.maxOutputTokens, MAX_JETONS_REPONSE);
});

test('les erreurs de Google deviennent un message lisible, jamais un objet brut', () => {
  const retire = traduireErreurGemini(404, { error: { code: 404, message: 'models/gemini-1.5-flash is not found', status: 'NOT_FOUND' } });
  assert.equal(retire.statut, 502, 'un 404 de Google ne doit pas passer pour un relais absent');

  const cle = traduireErreurGemini(400, { error: { message: 'API key not valid. Please pass a valid API key.' } });
  assert.match(cle.erreur, /clé Gemini/);

  assert.equal(traduireErreurGemini(429, {}).statut, 429);
  for (const statut of [400, 401, 403, 404, 429, 500, 503]) {
    assert.equal(typeof traduireErreurGemini(statut, { error: { code: statut } }).erreur, 'string');
  }
});
