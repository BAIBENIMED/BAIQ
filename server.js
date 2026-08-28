/**
 * Serveur Finanalyze — sert le build de production et relaie les appels à l'API Gemini.
 *
 * Pourquoi ce serveur ?
 * Dans une application 100% front-end, la clé API Gemini serait forcément intégrée
 * au code envoyé au navigateur (ou saisie par l'utilisateur et stockée en clair dans
 * localStorage), ce qui l'expose dans l'historique, les DevTools et tout journal réseau.
 * Ce petit serveur garde la clé côté serveur (variable d'environnement GEMINI_API_KEY)
 * et le navigateur ne parle jamais directement à Google — il appelle /api/gemini.
 *
 * Déploiement sur Render : créer un "Web Service" (et non un "Static Site"),
 * Build Command : npm install && npm run build
 * Start Command  : npm run start
 * Variable d'environnement à définir : GEMINI_API_KEY
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charge un fichier .env local si présent (développement uniquement).
// En production (Render, etc.), la variable GEMINI_API_KEY doit être définie
// directement dans les paramètres d'environnement de l'hébergeur.
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

const app = express();

app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ── Statut du relais (pour l'interface : savoir si Gemini est disponible sans exposer la clé) ──
app.get('/api/gemini/status', (req, res) => {
  res.json({ configured: Boolean(GEMINI_API_KEY) });
});

// ── Relais sécurisé vers l'API Gemini ──────────────────────────────────────
app.post('/api/gemini', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      error: "Clé API Gemini non configurée côté serveur. Définissez la variable d'environnement GEMINI_API_KEY sur votre hébergeur."
    });
  }

  const { modelName, body } = req.body || {};
  if (!modelName || !body) {
    return res.status(400).json({ error: 'Requête invalide : modelName et body sont requis.' });
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY, // header plutôt que ?key= dans l'URL : moins de risque de fuite via logs/historique
        },
        body: JSON.stringify(body),
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Erreur de connexion au service Gemini.', detail: String(err?.message || err) });
  }
});

// ── Sert le build de production (npm run build → dist/) ───────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Finanalyze démarré sur le port ${PORT} ${GEMINI_API_KEY ? '(clé Gemini configurée ✓)' : '(⚠ GEMINI_API_KEY manquante — les rapports IA seront indisponibles)'}`);
});
