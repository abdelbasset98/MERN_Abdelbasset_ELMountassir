const express = require('express');
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');

// Load simple KEY=value entries from back/.env without requiring another package.
// Values already provided by the process environment take precedence.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 5000;
const frontendPath = path.resolve(__dirname, '..', 'front');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.get('/api/db-status', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: states[mongoose.connection.readyState] || 'unknown' });
});

// Serve the existing frontend from the project-level front/ directory.
app.use(express.static(frontendPath));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(err.status || 500).json({ error: 'An unexpected server error occurred' });
});

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  if (!process.env.MONGO_URI) {
    console.log('MongoDB is not configured. Set MONGO_URI in back/.env to enable it.');
  }
});

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => {
      console.error('MongoDB connection failed:', error.message);
    });
}

function shutDown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(() => {
    mongoose.disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutDown('SIGINT'));
process.on('SIGTERM', () => shutDown('SIGTERM'));
