const dbRequest = indexedDB.open('PhotoInventoryDB', 1);

dbRequest.onupgradeneeded = function(event) {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('photos')) {
    db.createObjectStore('photos', { keyPath: 'id' });
  }
};

dbRequest.onerror = function(event) {
  console.error('Erro ao abrir IndexedDB:', event.target.errorCode);
};
