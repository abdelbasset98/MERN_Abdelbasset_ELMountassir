const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Exemple de données gardées en mémoire. Elles seront réinitialisées au redémarrage.
const items = [{ id: 1, name: 'Exemple' }];
let nextId = 2;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Le serveur répond' });
});

app.get('/api/items', (_req, res) => {
  res.json(items);
});

app.post('/api/items', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'Le champ name est obligatoire' });
  }

  const item = { id: nextId++, name };
  items.push(item);
  return res.status(201).json(item);
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

app.listen(PORT, () => {
  console.log(`Serveur sur le port ${PORT}`);
});
