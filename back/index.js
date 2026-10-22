const express = require('express');
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const entry = line.trim();
    if (!entry || entry.startsWith('#')) continue;
    const separator = entry.indexOf('=');
    if (separator < 1) continue;

    const key = entry.slice(0, separator).trim();
    let value = entry.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile();
const connectDB = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const frontendPath = path.resolve(__dirname, '..', 'front');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.get('origin');
  const development = process.env.NODE_ENV !== 'production';
  const allowed = !origin || allowedOrigins.includes(origin) ||
    (allowedOrigins.length === 0 && development);

  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(allowed ? 204 : 403);
  return next();
});

app.use(express.json({ limit: '1mb' }));

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, default: '', maxlength: 500 },
  requestId: { type: String, unique: true, sparse: true },
}, { timestamps: true });

const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

async function requireDatabase(_req, res, next) {
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error('Connexion MongoDB impossible :', error.message);
    return res.status(503).json({ error: 'Base de données indisponible' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
  });
});

app.get('/api/items', requireDatabase, async (_req, res) => {
  try {
    return res.json(await Item.find().sort({ createdAt: -1 }));
  } catch (error) {
    console.error('Lecture des items impossible :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/items', requireDatabase, async (req, res) => {
  const { name, description, requestId } = req.body || {};

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ error: 'Le nom est obligatoire (100 caractères maximum).' });
  }
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'La description doit être du texte.' });
  }
  if (requestId !== undefined && typeof requestId !== 'string') {
    return res.status(400).json({ error: 'requestId doit être du texte.' });
  }

  try {
    if (requestId) {
      const existing = await Item.findOne({ requestId });
      if (existing) return res.status(200).json(existing);
    }
    const item = await Item.create({ name, description, requestId });
    return res.status(201).json(item);
  } catch (error) {
    if (error.code === 11000 && requestId) {
      const existing = await Item.findOne({ requestId });
      if (existing) return res.status(200).json(existing);
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Création de l’item impossible :', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route API introuvable.' });
});

// The frontend and API share one origin, so no separate frontend server is needed.
app.use(express.static(frontendPath));

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Application disponible sur http://localhost:${PORT}`);
    connectDB().then(
      () => console.log('MongoDB est connecté.'),
      (error) => console.error('MongoDB indisponible :', error.message),
    );
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    });
  }
}

module.exports = app;
