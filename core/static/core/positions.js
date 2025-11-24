document.addEventListener('DOMContentLoaded', function () {
  // --- DOM элементы ---
  const jobList = document.getElementById('jobList');
  const jobCards = Array.from(document.querySelectorAll('.cv-job-card'));

  const sortBtn = document.getElementById('sortBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const favoritesBtn = document.getElementById('favoritesBtn');
  const sortModal = document.getElementById('sortModal');

  const sortDateSelect = document.getElementById('sortDateSelect');
  const levelSelect = document.getElementById('levelSelect');
  const companySelect = document.getElementById('companySelect');
  const modeSelect = document.getElementById('modeSelect');

  const clearFilterBtn = document.getElementById('clearFilterBtn');
  const applyFilterBtn = document.getElementById('applyFilterBtn');

  const favButtons = Array.from(document.querySelectorAll('.cv-fav-btn'));

  // --- избранное через localStorage ---
  const FAV_KEY = 'cv_favorites';
  let favorites = loadFavorites();
  let favoritesMode = false; // показывать только избранные или все

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to load favorites', e);
      return [];
    }
  }

  function saveFavorites() {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }

  function updateFavButtons() {
    favButtons.forEach(btn => {
      const id = btn.dataset.jobId;
      if (favorites.includes(id)) {
        btn.classList.add('cv-fav-btn-active');
        btn.textContent = '★';
      } else {
        btn.classList.remove('cv-fav-btn-active');
        btn.textContent = '☆';
      }
    });
  }

  // клик по звёздочке
  favButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.jobId;
      if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
      } else {
        favorites.push(id);
      }
      saveFavorites();
      updateFavButtons();
      applyFavoritesFilter(); // если открыт режим Favorites – обновляем список
    });
  });

  updateFavButtons();

  // --- фильтр "только избранные" ---
  function applyFavoritesFilter() {
    if (!favoritesMode) {
      jobCards.forEach(card => {
        card.style.display = '';
      });
      return;
    }

    jobCards.forEach(card => {
      const id = card.dataset.jobId;
      card.style.display = favorites.includes(id) ? '' : 'none';
    });
  }

  favoritesBtn.addEventListener('click', () => {
    favoritesMode = !favoritesMode;
    favoritesBtn.classList.toggle('active', favoritesMode);
    applyFavoritesFilter();
  });

  // --- refresh ---
  refreshBtn.addEventListener('click', () => {
    window.location.reload();
  });

  // --- модалка сортировки/фильтров ---
  sortBtn.addEventListener('click', () => {
    sortModal.classList.add('show');
  });

  // закрытие по клику в серый фон вокруг модалки
  sortModal.addEventListener('click', (e) => {
    if (e.target === sortModal) {
      sortModal.classList.remove('show');
    }
  });

  // --- применение сортировки и фильтров ---
  function applySortAndFilters() {
    let filtered = jobCards.slice();

    const level = levelSelect.value;     // Junior / Mid / Senior / ''
    const company = companySelect.value; // SAP / ''
    const mode = modeSelect.value;       // On-site / Hybrid / Remote / ''

    // фильтрация по полям
    filtered = filtered.filter(card => {
      const cardLevel = card.dataset.level;
      const cardCompany = card.dataset.company;
      const cardMode = card.dataset.mode;

      if (level && cardLevel !== level) return false;
      if (company && cardCompany !== company) return false;
      if (mode && cardMode !== mode) return false;

      return true;
    });

    // сортировка по дате
    const order = sortDateSelect.value; // newest / oldest
    filtered.sort((a, b) => {
      const da = new Date(a.dataset.date);
      const db = new Date(b.dataset.date);
      return order === 'newest' ? (db - da) : (da - db);
    });

    // перерисовать порядок карточек
    jobCards.forEach(card => jobList.removeChild(card));
    filtered.forEach(card => jobList.appendChild(card));

    // если включены избранные — сразу применяем и этот фильтр
    applyFavoritesFilter();
  }

  applyFilterBtn.addEventListener('click', () => {
    applySortAndFilters();
    sortModal.classList.remove('show');
  });

  clearFilterBtn.addEventListener('click', () => {
    sortDateSelect.value = 'newest';
    levelSelect.value = '';
    companySelect.value = '';
    modeSelect.value = '';

    // сбрасываем порядок и видимость
    jobCards.forEach(card => {
      card.style.display = '';
      jobList.appendChild(card);
    });

    applyFavoritesFilter();
  });
});
