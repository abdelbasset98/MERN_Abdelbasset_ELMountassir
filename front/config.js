// Local Live Server pages (for example port 5500) call the Express API on port 3000.
// When Express serves this page itself, an empty URL keeps requests same-origin.
const localHost = window.location.hostname || 'localhost';
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(localHost);
const servedByExpress = window.location.port === '3000';

window.APP_CONFIG = Object.freeze({
  API_BASE_URL: isLocal && !servedByExpress
    ? `http://${localHost}:3000`
    : '',
  REQUEST_TIMEOUT_MS: 10000,
});
