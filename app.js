// Data structures
let photos = [];
let currentPhotoId = null;
let notificationTimeout = null;

const themes = [
  {
    name: 'Claro Profissional',
    colors: {
      primary: '#2C3E50',
      secondary: '#3498DB',
      background: '#ECF0F1',
      surface: '#FFFFFF',
      text: '#2C3E50',
      accent: '#E74C3C'
    }
  },
  {
    name: 'Escuro Minimalista',
    colors: {
      primary: '#1A1A1A',
      secondary: '#404040',
      background: '#121212',
      surface: '#1E1E1E',
      text: '#E0E0E0',
      accent: '#FF6B6B'
    }
  },
  {
    name: 'Azul Corporativo',
    colors: {
      primary: '#0052CC',
      secondary: '#0066FF',
      background: '#F0F4F8',
      surface: '#FFFFFF',
      text: '#0052CC',
      accent: '#FF6B35'
    }
  },
  {
    name: 'Terra Natural',
    colors: {
      primary: '#8B6F47',
      secondary: '#D4A574',
      background: '#F5F1E8',
      surface: '#FBF8F3',
      text: '#8B6F47',
      accent: '#C9A961'
    }
  }
];


if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(() => {
    console.log("Service Worker registado!");
  });
}

let currentTheme = 0;

// Initialize app
async function init() {
  photos = await loadPhotosFromStorage();
  if (!Array.isArray(photos)) {
    photos = []; // garante que seja array
  }
  currentTheme = loadThemeFromStorage();
  applyTheme(currentTheme);
  renderPhotos();
  updateStats();
  renderThemeSelector();
  startExhibitionChecker();
}

// Menu functions
function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('menuOverlay');
  menu.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('menuOverlay');
  menu.classList.remove('open');
  overlay.classList.remove('active');
}

// Photo management
function openAddPhotoModal() {
  closeMenu();
  document.getElementById('addPhotoModal').classList.add('active');
}

function closeAddPhotoModal() {
  document.getElementById('addPhotoModal').classList.remove('active');
  document.getElementById('addPhotoForm').reset();
  document.getElementById('imagePreviewContainer').innerHTML = '';
}

function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem é muito grande! Tamanho máximo: 10MB');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('imagePreviewContainer');
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
    };
    reader.readAsDataURL(file);
  }
}


let photoIdToDelete = null;

function openDeleteConfirmModal(id) {
  photoIdToDelete = id;
  document.getElementById('deleteConfirmModal').classList.add('active');
}

function closeDeleteConfirmModal() {
  photoIdToDelete = null;
  document.getElementById('deleteConfirmModal').classList.remove('active');
}

function confirmDeletePhoto() {
  if (photoIdToDelete !== null) {
    photos = photos.filter(p => p.id !== photoIdToDelete);
    savePhotosToStorage();
    renderPhotos();
    updateStats();
    showNotification('🗑️ Foto eliminada', 'info');
    closeDeleteConfirmModal();
  }
}






function addPhoto(event) {
  event.preventDefault();
  
  const fileInput = document.getElementById('photoImage');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Por favor, selecione uma imagem!');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const photo = {
      id: Date.now(),
      name: document.getElementById('photoName').value,
      size: document.getElementById('photoSize').value,
      location: document.getElementById('photoLocation').value,
      image: e.target.result,
      dateAdded: new Date().toISOString(),
      exhibition: null
    };
    
    photos.push(photo);
    savePhotosToStorage();
    renderPhotos();
    updateStats();
    closeAddPhotoModal();
    showNotification('✅ Foto adicionada com sucesso!', 'success');
  };
  reader.readAsDataURL(file);
}

function deletePhoto(id) {
  if (confirm('Tem certeza que deseja eliminar esta foto?')) {
    photos = photos.filter(p => p.id !== id);
    savePhotosToStorage();
    renderPhotos();
    updateStats();
    showNotification('🗑️ Foto eliminada', 'info');
  }
}

function openExhibitionModal(id) {
  currentPhotoId = id;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('exhibitionStart').value = today;
  document.getElementById('exhibitionStart').min = today;
  document.getElementById('exhibitionEnd').min = today;
  document.getElementById('exhibitionModal').classList.add('active');
}

function closeExhibitionModal() {
  document.getElementById('exhibitionModal').classList.remove('active');
  document.getElementById('exhibitionForm').reset();
  currentPhotoId = null;
}

function setExhibition(event) {
  event.preventDefault();
  
  const startDate = document.getElementById('exhibitionStart').value;
  const endDate = document.getElementById('exhibitionEnd').value;
  
  if (new Date(endDate) < new Date(startDate)) {
    alert('A data de fim não pode ser anterior à data de início!');
    return;
  }
  
  const photo = photos.find(p => p.id === currentPhotoId);
  if (photo) {
    photo.exhibition = {
      start: startDate,
      end: endDate,
      notified: false
    };
    photo.location = 'Exposição';
    savePhotosToStorage();
    renderPhotos();
    updateStats();
    closeExhibitionModal();
    showNotification('📦 Foto adicionada à exposição!', 'success');
  }
}

function returnToHome(id) {
  const photo = photos.find(p => p.id === id);
  if (photo) {
    photo.location = 'Casa';
    photo.exhibition = null;
    savePhotosToStorage();
    renderPhotos();
    updateStats();
    showNotification('🏠 Foto retornou para Casa', 'info');
  }
}




function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('PhotoInventoryDB', 1);
    req.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    };
    req.onsuccess = function(event) {
      resolve(event.target.result);
    };
    req.onerror = function(event) {
      reject(event.target.error);
    };
  });
}


function renderPhotos() {
  const homePhotos = photos.filter(p => p.location === 'Casa');
  const exhibitionPhotos = photos.filter(p => p.location === 'Exposição');
  
  const homeGrid = document.getElementById('photosGrid');
  const exhibitionGrid = document.getElementById('exhibitionGrid');
  const exhibitionSection = document.getElementById('exhibitionSection');
  const emptyState = document.getElementById('emptyState');
  
  // Render home photos
  if (homePhotos.length === 0) {
    homeGrid.innerHTML = '';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    homeGrid.innerHTML = homePhotos.map(photo => createPhotoCard(photo)).join('');
  }
  
  // Render exhibition photos
  if (exhibitionPhotos.length === 0) {
    exhibitionSection.style.display = 'none';
  } else {
    exhibitionSection.style.display = 'block';
    exhibitionGrid.innerHTML = exhibitionPhotos.map(photo => createPhotoCard(photo, true)).join('');
  }
}

function createPhotoCard(photo, isExhibition = false) {
  const sizeLabels = {
    'pequeno': 'Pequeno',
    'medio': 'Médio',
    'grande': 'Grande'
  };
  
  let countdown = '';
  let dateRange = '';
  
  if (photo.exhibition) {
    const now = new Date();
    const endDate = new Date(photo.exhibition.end);
    const startDate = new Date(photo.exhibition.start);
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    const startStr = new Date(photo.exhibition.start).toLocaleDateString('pt-PT');
    const endStr = new Date(photo.exhibition.end).toLocaleDateString('pt-PT');
    dateRange = `<div class="date-range">📅 ${startStr} - ${endStr}</div>`;
    
    if (daysRemaining > 0) {
      countdown = `<div class="countdown active">⏰ ${daysRemaining} dias restantes</div>`;
    } else {
      countdown = `<div class="countdown">⏰ Terminada</div>`;
    }
  }
  
  const actions = isExhibition
    ? `<button class="btn btn-secondary btn-small" onclick="returnToHome(${photo.id})">🏠 Voltar para Casa</button>
       <button class="btn btn-danger btn-small" onclick="openDeleteConfirmModal(${photo.id})">🗑️</button>`
    : `<button class="btn btn-primary btn-small" onclick="openExhibitionModal(${photo.id})">📦 Para Exposição</button>
       <button class="btn btn-danger btn-small" onclick="openDeleteConfirmModal(${photo.id})">🗑️</button>`;
  
  return `
    <div class="photo-card">
      <img src="${photo.image}" alt="${photo.name}" class="photo-image" onclick="openImageModal('${photo.image}', '${photo.name}')">
      <div class="photo-content">
        <div class="photo-name">${photo.name}</div>
        <div class="photo-details">
          <div>📏 Tamanho: ${sizeLabels[photo.size]}</div>
          <div>📍 Localização: ${photo.location}</div>
          ${dateRange}
        </div>
        ${countdown}
        <div class="photo-actions">
          ${actions}
        </div>
      </div>
    </div>
  `;
}


function openImageModal(src, caption) {
  document.getElementById('modalImg').src = src;
  document.getElementById('modalImgCaption').innerText = caption;
  document.getElementById('imageModal').classList.add('active');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
  document.getElementById('modalImg').src = '';
}









function updateStats() {
  const total = photos.length;
  const small = photos.filter(p => p.size === 'pequeno').length;
  const medium = photos.filter(p => p.size === 'medio').length;
  const large = photos.filter(p => p.size === 'grande').length;
  
  document.getElementById('totalPhotos').textContent = total;
  document.getElementById('smallCount').textContent = small;
  document.getElementById('mediumCount').textContent = medium;
  document.getElementById('largeCount').textContent = large;
}

function scrollToStats() {
  closeMenu();
  document.getElementById('statsSection').scrollIntoView({ behavior: 'smooth' });
}

// Theme management
function renderThemeSelector() {
  const selector = document.getElementById('themeSelector');
  selector.innerHTML = themes.map((theme, index) => `
    <div class="theme-option ${index === currentTheme ? 'active' : ''}" onclick="applyTheme(${index})">
      <div class="theme-color-preview" style="background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary});"></div>
      <div class="theme-name">${theme.name}</div>
    </div>
  `).join('');
}

function applyTheme(index) {
  currentTheme = index;
  saveThemeToStorage();
  const theme = themes[index];
  const root = document.documentElement;

  Object.keys(theme.colors).forEach(key => {
    root.style.setProperty(`--${key}`, theme.colors[key]);
  });

  // Atualizar sombra e borda
  const isDark = theme.name.includes('Escuro');
  root.style.setProperty('--shadow', isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)');
  root.style.setProperty('--border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');

  // Adiciona ou remove classe no body para tema escuro
  if (isDark) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }

  renderThemeSelector();
  showNotification(`🎨 Tema alterado para: ${theme.name}`, 'info');
}


function openThemeModal() {
  closeMenu();
  document.getElementById('themeModal').classList.add('active');
}

function closeThemeModal() {
  document.getElementById('themeModal').classList.remove('active');
}



function showExportJsonModal(jsonString) {
  const modalHtml = `
    <div id="jsonExportModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div style="background:#fff;padding:1rem;max-width:90%;max-height:80%;overflow:auto;border-radius:8px;">
        <h3>Copie o JSON exportado</h3>
        <textarea style="width:100%;height:300px;">${jsonString}</textarea>
        <button onclick="document.getElementById('jsonExportModal').remove()">Fechar</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}




/*function exportData() {
  const data = {
    photos: photos,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  const jsonString = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `inventario-fotos-${new Date().toISOString().split('T')[0]}.json`;

  // Tem que anexar à página para funcionar em alguns navegadores móveis
  document.body.appendChild(a);
  a.click();
  
  // Remover depois
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification('📤 JSON exportado! Verifique a pasta de downloads.', 'success'); 
}*/


//let gapiInitialized = false;




let tokenClient;

function initializeGsiTokenClient() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: '177981579072-3psnkbj4tvqd6qjl4u96gl5bg0e80j9c.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: (tokenResponse) => {
      // tokenResponse.access_token disponível para usar
      uploadFileToDrive(tokenResponse.access_token);
    },
  });
}

window.onload = () => {
  initializeGSI(); // seu login do gsi existente
  initializeGsiTokenClient(); // inicializa token client para Drive
};

let jsonString = ''; // Variável global para armazenar o JSON a exportar

function exportToDrive() {
  if (!tokenClient){
    showNotification('Erro tokenClient não inicializado', 'error');
  }
  
  const data = {
    photos: photos,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  jsonString = JSON.stringify(data, null, 2);

  // Solicita token OAuth 2.0 para o escopo do Drive
  tokenClient.requestAccessToken();
}

// Função para fazer o upload ao Google Drive após receber token
async function uploadFileToDrive(accessToken) {
  const fileMetadata = {
    name: `inventario-fotos-${new Date().toISOString().split('T')[0]}.json`,
    mimeType: 'application/json'
  };
  const fileContent = new Blob([jsonString], { type: 'application/json' });

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
  form.append('file', fileContent);

  try {
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
      body: form
    });

    if (response.ok) {
      showNotification('✅ JSON exportado para Google Drive!', 'success');
    } else {
      showNotification('❌ Falha ao fazer upload para o Drive.', 'error');
      console.error(await response.text());
    }
  } catch (error) {
    console.error('Erro durante upload para Drive:', error);
    showNotification('❌ Erro ao exportar para Google Drive.', 'error');
  }
}


// Importar da Drive
function openDriveImportModal() {
  document.getElementById('driveImportModal').style.display = 'block';
}

function closeDriveImportModal() {
  document.getElementById('driveImportModal').style.display = 'none';
  document.getElementById('driveFileList').innerHTML = '';
}

// Função para listar ficheiros JSON na Drive
async function listDriveJsonFiles() {
  if (!tokenClient || !tokenClient.access_token) {
    // Pede token se não tiver
    tokenClient.requestAccessToken();
    return; // O callback reinicia esta função após receber token
  }

  const accessToken = tokenClient.access_token;

  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/json"&fields=files(id,name)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!data.files || data.files.length === 0) {
      alert('Nenhum ficheiro JSON encontrado na sua Drive.');
      return;
    }

    const select = document.getElementById('driveFileList');
    select.innerHTML = '';
    
    data.files.forEach(file => {
      const option = document.createElement('option');
      option.value = file.id;
      option.textContent = file.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Erro a listar ficheiros da Drive:', error);
    alert('Erro ao listar ficheiros.');
  }
}

async function importSelectedDriveFile() {
  const select = document.getElementById('driveFileList');
  const fileId = select.value;
  if (!fileId) {
    alert('Por favor, selecione um ficheiro.');
    return;
  }

  // Usa a função de importação que te dei antes
  const accessToken = tokenClient.access_token;
  if (!accessToken) {
    alert('Token de acesso não disponível. Por favor, faça login novamente.');
    return;
  }

  await importJsonFromDrive(fileId, accessToken);
}

// Função que importa JSON da Drive e atualiza app (reutiliza do exemplo anterior)
async function importJsonFromDrive(fileId, accessToken) {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Erro a buscar ficheiro: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.photos && Array.isArray(data.photos)) {
      photos = data.photos;
      await savePhotosToStorage();
      renderPhotos();
      updateStats();
      showNotification('📥 Dados importados com sucesso da Drive!', 'success');
      closeDriveImportModal();
    } else {
      alert('Formato inválido do ficheiro JSON da Drive.');
    }

  } catch (error) {
    console.error('Erro importar JSON Drive:', error);
    showNotification('❌ Falha ao importar JSON da Drive.', 'error');
  }
}





/*gapi.load("client:auth2", () => {
  gapi.auth2.init({client_id: "177981579072-3psnkbj4tvqd6qjl4u96gl5bg0e80j9c.apps.googleusercontent.com"});
});*/




function openImportModal() {
  closeMenu();
  document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('active');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!confirm('Tem certeza? Isto irá substituir todos os dados atuais!')) {
    event.target.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.photos && Array.isArray(data.photos)) {
        photos = data.photos;
        savePhotosToStorage();
        renderPhotos();
        updateStats();
        closeImportModal();
        showNotification('📥 Dados importados com sucesso!', 'success');
      } else {
        alert('Formato de ficheiro inválido!');
      }
    } catch (error) {
      alert('Erro ao ler o ficheiro. Certifique-se de que é um ficheiro JSON válido.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}


async function savePhotosToStorage() {
  const db = await openDB();
  const tx = db.transaction('photos', 'readwrite');
  const store = tx.objectStore('photos');

  // Limpa a store antes de inserir fotos novas (simplifica sincronização)
  store.clear();

  // Adiciona fotos atuais
  photos.forEach(photo => {
    store.put(photo);
  });

  await tx.complete;
  db.close();
}


async function loadPhotosFromStorage() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result);
      db.close();
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}



function saveThemeToStorage() {
  localStorage.setItem('currentTheme', currentTheme);
}

function loadThemeFromStorage(){
  const value = localStorage.getItem('currentTheme');
  return value !== null ? parseInt(value, 10) : 0;
}



async function backupToDropbox() {
  const ACCESS_TOKEN = 'SEU_ACCESS_TOKEN_AQUI';
  const dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN });
  
  const data = localStorage.getItem('photos') || '[]';
  const path = '/backup-inventario-fotos.json';

  try {
    await dbx.filesUpload({
      path: path,
      contents: data,
      mode: 'overwrite'
    });
    showNotification('✔ Backup enviado ao Dropbox com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao enviar backup Dropbox:', error);
    showNotification('❌ Falha ao enviar backup para Dropbox.', 'error');
  }
}





// PDF Export
function exportExhibitionPDF() {
  closeMenu();
  
  const exhibitionPhotos = photos.filter(p => p.location === 'Exposição');
  
  if (exhibitionPhotos.length === 0) {
    alert('Não há fotos em exposição para exportar!');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Lista de Exposição de Fotos', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 105, 28, { align: 'center' });
  
  let y = 40;
  
  exhibitionPhotos.forEach((photo, index) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${index + 1}. ${photo.name}`, 20, y);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    y += 7;
    
    const sizeLabels = { 'pequeno': 'Pequeno', 'medio': 'Médio', 'grande': 'Grande' };
    doc.text(`   Tamanho: ${sizeLabels[photo.size]}`, 20, y);
    y += 6;
    
    if (photo.exhibition) {
      const startStr = new Date(photo.exhibition.start).toLocaleDateString('pt-PT');
      const endStr = new Date(photo.exhibition.end).toLocaleDateString('pt-PT');
      doc.text(`   Período: ${startStr} - ${endStr}`, 20, y);
      y += 6;
    }
    
    // Try to add image
    try {
      if (photo.image) {
        doc.addImage(photo.image, 'JPEG', 20, y, 40, 30);
        y += 35;
      }
    } catch (error) {
      doc.text('   [Imagem não disponível]', 20, y);
      y += 10;
    }
    
    y += 5;
  });
  
  doc.save(`exposicao-${new Date().toISOString().split('T')[0]}.pdf`);
  showNotification('📄 PDF exportado com sucesso!', 'success');
}


// Notifications
function showNotification(message, type = 'info') {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function handleCredentialResponse(response) {
  // O token JWT retornado após login
  console.log("Token JWT recebido:", response.credential);
  
  // Aqui você pode enviar o token para sua API ou usá-lo para autenticação
}

function initializeGSI() {
  google.accounts.id.initialize({
    client_id: '177981579072-3psnkbj4tvqd6qjl4u96gl5bg0e80j9c.apps.googleusercontent.com',
    callback: handleCredentialResponse
  });

  // Renderizar botão de login automático
  google.accounts.id.renderButton(
    document.getElementById('gsi-button'), // um div em seu HTML
    { theme: 'outline', size: 'large' }
  );
  
  // Para mostrar prompt automaticamente (opcional)
  // google.accounts.id.prompt();
}

// Chame esta função quando a página carregar
window.onload = () => {
  initializeGSI();
  initializeGsiTokenClient();
};


// Exhibition checker
function startExhibitionChecker() {
  setInterval(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    photos.forEach(photo => {
      if (photo.exhibition && !photo.exhibition.notified) {
        const endDate = new Date(photo.exhibition.end);
        endDate.setHours(0, 0, 0, 0);
        
        if (now > endDate) {
          photo.exhibition.notified = true;
          showNotification(`⚠️ Exposição '${photo.name}' terminou em ${new Date(photo.exhibition.end).toLocaleDateString('pt-PT')}`, 'warning');
        }
      }
    });
  }, 1000);
}





// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  init();
  initializeGSI();
});
