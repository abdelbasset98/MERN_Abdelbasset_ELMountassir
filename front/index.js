const form = document.querySelector('#item-form');
const nameInput = document.querySelector('#name');
const descriptionInput = document.querySelector('#description');
const submitButton = document.querySelector('#submit-btn');
const refreshButton = document.querySelector('#refresh-btn');
const message = document.querySelector('#message');
const itemsMessage = document.querySelector('#items-message');
const itemsList = document.querySelector('#items');
const connectionStatus = document.querySelector('#connection-status');
const source = document.querySelector('#source');

const config = window.APP_CONFIG || { API_BASE_URL: '', REQUEST_TIMEOUT_MS: 10000 };
const apiBase = config.API_BASE_URL.replace(/\/$/, '');

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Erreur du serveur (${response.status}).`);
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Le serveur met trop de temps à répondre.');
    }
    if (error instanceof TypeError) {
      throw new Error('Impossible de joindre le serveur. Vérifiez qu’il est démarré.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function showMessage(text = '', type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function renderItems(items) {
  itemsList.replaceChildren();
  itemsMessage.hidden = items.length > 0;
  itemsMessage.textContent = items.length === 0
    ? 'Aucun élément pour le moment.'
    : '';

  for (const item of items) {
    const row = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = item.name;
    row.append(title);

    if (item.description) {
      const description = document.createElement('small');
      description.textContent = item.description;
      row.append(description);
    }
    if (item.createdAt) {
      const date = document.createElement('time');
      date.dateTime = item.createdAt;
      date.textContent = new Date(item.createdAt).toLocaleString('fr-FR');
      row.append(date);
    }
    itemsList.append(row);
  }
}

async function loadItems() {
  itemsMessage.hidden = false;
  itemsMessage.textContent = 'Chargement des éléments…';
  try {
    const items = await apiRequest('/api/items');
    renderItems(items);
    connectionStatus.textContent = 'Base connectée';
    connectionStatus.classList.remove('offline');
    source.textContent = `API : ${apiBase || window.location.origin}`;
  } catch (error) {
    itemsList.replaceChildren();
    itemsMessage.textContent = error.message;
    connectionStatus.textContent = 'Base indisponible';
    connectionStatus.classList.add('offline');
    source.textContent = '';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('Envoi en cours…');
  submitButton.disabled = true;

  const payload = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
  };
  if (globalThis.crypto?.randomUUID) payload.requestId = globalThis.crypto.randomUUID();

  try {
    await apiRequest('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    form.reset();
    showMessage('Élément ajouté.', 'ok');
    await loadItems();
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener('click', loadItems);

apiRequest('/api/health')
  .then((health) => {
    if (health.database !== 'connected') {
      connectionStatus.textContent = 'Serveur actif, base déconnectée';
      connectionStatus.classList.add('offline');
    }
  })
  .catch(() => {
    connectionStatus.textContent = 'Serveur inaccessible';
    connectionStatus.classList.add('offline');
  });

loadItems();
