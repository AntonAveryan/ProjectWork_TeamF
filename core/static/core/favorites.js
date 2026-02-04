// Favorites page – load favorites from backend GET /favorites

document.addEventListener('DOMContentLoaded', function () {
  const favoritesList = document.getElementById('favoritesList');
  const loadingEl = document.getElementById('favoritesLoading');
  const errorEl = document.getElementById('favoritesError');
  const errorMsgEl = document.getElementById('favoritesErrorMessage');
  const emptyEl = document.getElementById('favoritesEmpty');

  const FAV_JOBS_KEY = 'cv_favorite_jobs'; // still used to keep local cache in sync
  const FAVORITES_API_BASE_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

  function showLoading() {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    emptyEl.style.display = 'none';
    favoritesList.style.display = 'none';
  }

  function hideLoading() {
    loadingEl.style.display = 'none';
  }

  function showError(message) {
    errorMsgEl.textContent = message || 'Failed to load favorites.';
    errorEl.style.display = 'block';
    favoritesList.style.display = 'none';
    emptyEl.style.display = 'none';
  }

  function showEmpty() {
    emptyEl.style.display = 'block';
    favoritesList.style.display = 'none';
    errorEl.style.display = 'none';
  }

  function showList() {
    favoritesList.style.display = '';
    emptyEl.style.display = 'none';
    errorEl.style.display = 'none';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function fetchFavoriteJobsFromBackend() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      throw new Error('Please sign in to view your favorite jobs.');
    }

    const response = await fetch(`${FAVORITES_API_BASE_URL}/favorites`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      let detail = '';
      try {
        const data = await response.json();
        detail = data.detail || JSON.stringify(data);
      } catch (_) {
        detail = `HTTP ${response.status}`;
      }
      throw new Error(detail || 'Failed to load favorites');
    }

    const favorites = await response.json();

    // Sync localStorage map for compatibility with positions.js
    try {
      const map = {};
      favorites.forEach(job => {
        const urn = job.urn || job.job_urn || job.id?.toString();
        if (!urn) return;
        map[urn] = {
          title: job.title,
          urn: job.urn,
          company: job.company,
          location: job.location,
          apply_link: job.apply_link,
          description: job.description || '',
          source: job.source || 'linkedin',
        };
      });
      localStorage.setItem(FAV_JOBS_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to sync favorites cache to localStorage', e);
    }

    return favorites;
  }

  function renderFavoriteJobs(jobs) {
    favoritesList.innerHTML = '';

    if (!jobs.length) {
      showEmpty();
      return;
    }

    showList();

    jobs.forEach((job, index) => {
      const card = document.createElement('div');
      card.className = 'cv-job-card';

      const title = (job.title || '').trim();
      const company = (job.company || '').trim();
      const location = (job.location || '').trim();
      const description = (job.description || '').trim();
      const applyLink = (job.apply_link || job.applyLink || job.url || '').trim();

      let titleText = title || 'No title';
      if (company) titleText += `, ${company}`;
      if (location) titleText += `, ${location}`;

      let companyLogo = 'JOB';
      if (company) {
        companyLogo = company.substring(0, 3).toUpperCase();
      } else if (title) {
        companyLogo = title.substring(0, 1).toUpperCase();
      }

      let descriptionHtml = '';
      if (description) {
        descriptionHtml = `<div class="cv-job-desc">${escapeHtml(description)}</div>`;
      } else {
        descriptionHtml = `<div class="cv-job-desc" style="color: #7b6660; font-style: italic;">Click "Apply" to view full job details on LinkedIn</div>`;
      }

      let applyButtonHtml = '';
      if (applyLink && (applyLink.startsWith('http://') || applyLink.startsWith('https://'))) {
        applyButtonHtml = `<a href="${escapeHtml(applyLink)}" target="_blank" rel="noopener noreferrer" class="cv-primary-btn cv-apply-btn">Apply →</a>`;
      } else {
        applyButtonHtml = `<button class="cv-primary-btn cv-apply-btn" disabled style="opacity: 0.5; cursor: not-allowed;">No link available</button>`;
      }

      // GET /favorites returns each item with id (number). Use for DELETE /favorites/{id}.
      const favoriteId = typeof job.id === 'number' ? job.id : (job.id != null && job.id !== '' ? Number(job.id) : NaN);
      const hasValidId = Number.isFinite(favoriteId);
      const removeBtnHtml = `<button type="button" class="cv-remove-fav-btn" data-favorite-id="${hasValidId ? favoriteId : ''}" title="Remove from favorites" ${hasValidId ? '' : 'disabled'}>Remove</button>`;

      card.innerHTML = `
        <div class="cv-job-main">
          <div class="cv-job-logo">
            ${companyLogo}
          </div>
          <div class="cv-job-info">
            <div class="cv-job-title">
              ${escapeHtml(titleText)}
            </div>
            ${descriptionHtml}
          </div>
        </div>
        <div class="cv-job-actions">
          ${removeBtnHtml}
          ${applyButtonHtml}
        </div>
      `;

      const removeBtn = card.querySelector('.cv-remove-fav-btn');
      if (removeBtn && hasValidId) {
        removeBtn.addEventListener('click', () => deleteFavoriteAndRemoveCard(removeBtn, card, favoriteId));
      }

      favoritesList.appendChild(card);
    });
  }

  async function deleteFavoriteAndRemoveCard(buttonEl, cardEl, favoriteId) {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      showError('Please sign in to remove favorites.');
      return;
    }

    buttonEl.disabled = true;
    buttonEl.textContent = '…';

    try {
      const response = await fetch(`${FAVORITES_API_BASE_URL}/favorites/${favoriteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204 || response.status === 404) {
        cardEl.remove();
        const remaining = favoritesList.querySelectorAll('.cv-job-card');
        if (remaining.length === 0) {
          showEmpty();
        }
      } else {
        let msg = 'Failed to remove favorite.';
        try {
          const data = await response.json();
          msg = data.detail || msg;
        } catch (_) {}
        showError(msg);
      }
    } catch (err) {
      console.error('Delete favorite error:', err);
      showError('Could not remove favorite. Please try again.');
    } finally {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Remove';
    }
  }

  // Init
  showLoading();
  fetchFavoriteJobsFromBackend()
    .then(jobs => {
      hideLoading();
      renderFavoriteJobs(jobs);
    })
    .catch(err => {
      console.error('Failed to fetch favorites from backend', err);
      hideLoading();
      if (err.message && err.message.toLowerCase().includes('sign in')) {
        showError('Please sign in to view your favorite jobs.');
      } else {
        showError(err.message || 'Failed to load favorites.');
      }
    });
});

