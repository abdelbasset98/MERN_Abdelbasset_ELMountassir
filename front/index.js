const form = document.querySelector('#item-form');
const nameInput = document.querySelector('#name');
const descriptionInput = document.querySelector('#description');
const formMessage = document.querySelector('#form-message');
const itemsList = document.querySelector('#items-list');
const itemsMessage = document.querySelector('#items-message');
const connectionStatus = document.querySelector('#connection-status');
const refreshButton = document.querySelector('#refresh-button');

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

function renderItems(items) {
  itemsList.replaceChildren();
  itemsMessage.hidden = items.length > 0;
  itemsMessage.textContent = items.length
    ? ''
    : 'Aucun item pour le moment. Ajoutez-en un ci-dessus.';

  for (const item of items) {
    const row = document.createElement('li');
    row.className = 'item';
    const title = document.createElement('h3');
    title.textContent = item.name;
    row.append(title);

    if (item.description) {
      const description = document.createElement('p');
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
  itemsMessage.textContent = 'Chargement des items…';
  try {
    renderItems(await api('/items'));
    connectionStatus.textContent = 'Connecté';
    connectionStatus.classList.remove('offline');
  } catch (error) {
    itemsList.replaceChildren();
    itemsMessage.textContent = error.message;
    connectionStatus.textContent = 'Hors ligne';
    connectionStatus.classList.add('offline');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    await api('/items', {
      method: 'POST',
      body: JSON.stringify({
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim(),
      }),
    });
    form.reset();
    await loadItems();
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener('click', loadItems);

fetch('/api/health')
  .then((response) => response.json())
  .then((health) => {
    if (health.database !== 'connected') {
      connectionStatus.textContent = 'Base de données hors ligne';
      connectionStatus.classList.add('offline');
    }
  })
  .catch(() => {
    connectionStatus.textContent = 'Serveur inaccessible';
    connectionStatus.classList.add('offline');
  });

loadItems();
