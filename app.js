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

let currentTheme = 0;

// Initialize app
function init() {
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
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande! Tamanho máximo: 2MB');
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
    renderPhotos();
    updateStats();
    showNotification('🏠 Foto retornou para Casa', 'info');
  }
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
       <button class="btn btn-danger btn-small" onclick="deletePhoto(${photo.id})">🗑️</button>`
    : `<button class="btn btn-primary btn-small" onclick="openExhibitionModal(${photo.id})">📦 Para Exposição</button>
       <button class="btn btn-danger btn-small" onclick="deletePhoto(${photo.id})">🗑️</button>`;
  
  return `
    <div class="photo-card">
      <img src="${photo.image}" alt="${photo.name}" class="photo-image">
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
  const theme = themes[index];
  const root = document.documentElement;
  
  Object.keys(theme.colors).forEach(key => {
    root.style.setProperty(`--${key}`, theme.colors[key]);
  });
  
  // Update shadow and border based on theme brightness
  const isDark = theme.name.includes('Escuro');
  root.style.setProperty('--shadow', isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)');
  root.style.setProperty('--border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
  
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

// Import/Export
function exportData() {
  closeMenu();
  const data = {
    photos: photos,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventario-fotos-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('📤 Dados exportados com sucesso!', 'success');
}

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
window.addEventListener('DOMContentLoaded', init);