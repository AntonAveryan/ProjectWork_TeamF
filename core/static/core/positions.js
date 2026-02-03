// API Configuration - use API_BASE_URL from login.js if available
const JOBS_API_BASE_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', function () {
  // --- DOM elements ---
  const jobList = document.getElementById('jobList');
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const emptyState = document.getElementById('emptyState');
  
  const cityInput = document.getElementById('cityInput');
  const searchJobsBtn = document.getElementById('searchJobsBtn');
  
  const refreshBtn = document.getElementById('refreshBtn');

  // --- State ---
  let allJobs = []; // All jobs from API
  let jobCards = []; // DOM elements
  let favorites = loadFavorites();
  let currentCity = 'London'; // Default city

  const FAV_KEY = 'cv_favorites';
  const FAV_JOBS_KEY = 'cv_favorite_jobs';

  // --- Favorites Management ---
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

  function loadFavoriteJobsMap() {
    try {
      const raw = localStorage.getItem(FAV_JOBS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('Failed to load favorite jobs map', e);
      return {};
    }
  }

  function saveFavoriteJobsMap(map) {
    localStorage.setItem(FAV_JOBS_KEY, JSON.stringify(map));
  }

  // in‑memory cache of full favorite job objects (for Favorites page)
  let favoriteJobsMap = loadFavoriteJobsMap();

  function updateFavButtons() {
    const favButtons = document.querySelectorAll('.cv-fav-btn');
    favButtons.forEach(btn => {
      const urn = btn.dataset.jobUrn;
      if (favorites.includes(urn)) {
        btn.classList.add('cv-fav-btn-active');
        btn.textContent = '★';
      } else {
        btn.classList.remove('cv-fav-btn-active');
        btn.textContent = '☆';
      }
    });
  }

  // --- Fetch Jobs from API ---
  async function fetchJobs(city, maxPages = 1) {
    showLoading();
    hideError();
    hideEmptyState();

    try {
      const accessToken = localStorage.getItem('access_token');
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const url = `${JOBS_API_BASE_URL}/scrape-jobs?city=${encodeURIComponent(city)}&max_pages=${maxPages}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404 && data.detail && data.detail.includes('career fields')) {
          throw new Error('No career fields found. Please upload your CV first in the chat section.');
        }
        throw new Error(data.detail || 'Failed to fetch jobs');
      }

      // Combine jobs from both career_field_search and skills_search
      const jobs = [];
      
      if (data.career_field_search && data.career_field_search.jobs) {
        jobs.push(...data.career_field_search.jobs);
      }
      
      if (data.skills_search && data.skills_search.jobs) {
        // Avoid duplicates by checking URN
        const existingUrns = new Set(jobs.map(j => j.urn));
        data.skills_search.jobs.forEach(job => {
          if (!existingUrns.has(job.urn)) {
            jobs.push(job);
          }
        });
      }

      // Debug: Log job data structure
      if (jobs.length > 0) {
        console.log('=== Jobs Data Debug ===');
        console.log('Total jobs:', jobs.length);
        console.log('First job keys:', Object.keys(jobs[0]));
        console.log('First job data:', jobs[0]);
        console.log('========================');
      }

      allJobs = jobs;
      renderJobs(jobs);
      hideLoading();
      
      if (jobs.length === 0) {
        showEmptyState('No jobs found for this city. Try a different city or upload your CV first.');
      }

    } catch (error) {
      console.error('Error fetching jobs:', error);
      hideLoading();
      showError(error.message || 'Failed to load jobs. Make sure you have uploaded your CV and have career fields in your profile.');
    }
  }

  // --- Render Jobs ---
  function renderJobs(jobs) {
    // Clear existing jobs
    jobList.innerHTML = '';
    jobCards = [];

    if (jobs.length === 0) {
      showEmptyState('No jobs found.');
      return;
    }

    hideEmptyState();

    jobs.forEach((job, index) => {
      const jobCard = createJobCard(job, index);
      jobList.appendChild(jobCard);
      jobCards.push(jobCard);
    });

    // Update favorites buttons
    updateFavButtons();
  }

  // --- Create Job Card ---
  function createJobCard(job, index) {
    const card = document.createElement('div');
    card.className = 'cv-job-card';
    
    // Get job data with proper fallbacks (check multiple possible field names)
    const jobTitle = (job.title || job.job_title || '').trim();
    const jobCompany = (job.company || job.company_name || '').trim();
    const jobLocation = (job.location || job.job_location || '').trim();
    const jobDescription = (job.description || job.job_description || '').trim();
    // Check multiple possible field names for apply link
    const jobApplyLink = (job.apply_link || job.applyLink || job.url || job.link || job.job_url || '').trim();
    const jobUrn = job.urn || job.job_urn || `job-${index}`;

    card.dataset.jobUrn = jobUrn;
    card.dataset.company = jobCompany;
    card.dataset.level = ''; // API doesn't provide level, but we can extract from title
    card.dataset.mode = ''; // API doesn't provide mode
    card.dataset.date = new Date().toISOString().split('T')[0]; // Use current date as fallback

    // Extract level from title if possible
    const titleLower = jobTitle.toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('sr.')) {
      card.dataset.level = 'Senior';
    } else if (titleLower.includes('junior') || titleLower.includes('jr.')) {
      card.dataset.level = 'Junior';
    } else if (titleLower.includes('mid') || titleLower.includes('middle')) {
      card.dataset.level = 'Mid';
    }

    // Company logo (first 3 letters or initials)
    let companyLogo = 'JOB';
    if (jobCompany) {
      companyLogo = jobCompany.substring(0, 3).toUpperCase();
    } else if (jobTitle) {
      // Use first letter of title if no company
      companyLogo = jobTitle.substring(0, 1).toUpperCase();
    }

    // Build title text
    let titleText = jobTitle || 'No title';
    if (jobCompany) {
      titleText += `, ${jobCompany}`;
    }
    if (jobLocation) {
      titleText += `, ${jobLocation}`;
    }

    // Description - show message if empty
    let descriptionHtml = '';
    if (jobDescription) {
      descriptionHtml = `<div class="cv-job-desc">${escapeHtml(jobDescription)} <span class="cv-job-more">more…</span></div>`;
    } else {
      descriptionHtml = `<div class="cv-job-desc" style="color: #7b6660; font-style: italic;">Click "Apply" to view full job details on LinkedIn</div>`;
    }

    // Check if favorited
    const isFavorited = favorites.includes(jobUrn);
    const favIcon = isFavorited ? '★' : '☆';
    const favClass = isFavorited ? 'cv-fav-btn-active' : '';

    // Apply button - only show if we have a valid link
    let applyButtonHtml = '';
    if (jobApplyLink && jobApplyLink !== '#' && (jobApplyLink.startsWith('http://') || jobApplyLink.startsWith('https://'))) {
      // Ensure link is properly formatted
      const cleanLink = jobApplyLink.trim();
      applyButtonHtml = `<a href="${escapeHtml(cleanLink)}" target="_blank" rel="noopener noreferrer" class="cv-primary-btn cv-apply-btn">Apply →</a>`;
    } else {
      // If no link, show disabled button
      applyButtonHtml = `<button class="cv-primary-btn cv-apply-btn" disabled style="opacity: 0.5; cursor: not-allowed;">No link available</button>`;
    }

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
        <button class="cv-fav-btn ${favClass}" type="button" data-job-urn="${escapeHtml(jobUrn)}">${favIcon}</button>
        ${applyButtonHtml}
      </div>
    `;

    // Add favorite button event listener
    const favBtn = card.querySelector('.cv-fav-btn');
    if (favBtn) {
      favBtn.addEventListener('click', async () => {
        const urn = favBtn.dataset.jobUrn;
        const isAlreadyFav = favorites.includes(urn);

        if (isAlreadyFav) {
          // local unfavorite only (no DELETE endpoint specified yet)
          favorites = favorites.filter(f => f !== urn);
          delete favoriteJobsMap[urn];
          saveFavorites();
          saveFavoriteJobsMap(favoriteJobsMap);
          updateFavButtons();
          applyFavoritesFilter();
          return;
        }

        // Add to local favorites immediately for snappy UI
        favorites.push(urn);
        favoriteJobsMap[urn] = {
          title: jobTitle,
          urn: jobUrn,
          company: jobCompany,
          location: jobLocation,
          apply_link: jobApplyLink,
          description: jobDescription,
          source: 'linkedin',
        };
        saveFavorites();
        saveFavoriteJobsMap(favoriteJobsMap);
        updateFavButtons();

        // Also persist to backend /favorites endpoint
        try {
          const jobPayload = {
            title: jobTitle || 'Unknown title',
            urn: jobUrn,
            company: jobCompany || undefined,
            location: jobLocation || undefined,
            apply_link: jobApplyLink || undefined,
            source: 'linkedin',
          };
          console.log('Saving favorite to backend:', jobPayload);
          await saveFavoriteToBackend(jobPayload);
        } catch (e) {
          console.error('Failed to save favorite to backend', e);
        }
      });
    }

    return card;
  }

  // --- Update Company Select ---
  function updateCompanySelect(jobs) {
    const companies = [...new Set(jobs.map(j => j.company).filter(Boolean))].sort();
    companySelect.innerHTML = '<option value="">Any</option>';
    companies.forEach(company => {
      const option = document.createElement('option');
      option.value = company;
      option.textContent = company;
      companySelect.appendChild(option);
    });
  }

  // --- Backend Favorites API ---
  async function saveFavoriteToBackend(jobPayload) {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      console.warn('Cannot save favorite to backend: user not logged in');
      return;
    }

    console.log('Calling POST /favorites with payload:', jobPayload);

    try {
      const response = await fetch(`${JOBS_API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(jobPayload),
      });

      if (!response.ok) {
        let errDetail = '';
        try {
          const data = await response.json();
          errDetail = data.detail || JSON.stringify(data);
        } catch (_) {
          errDetail = `HTTP ${response.status}`;
        }
        console.error('Backend /favorites error:', response.status, errDetail);
        throw new Error(`Failed to save favorite: ${errDetail}`);
      }

      // Response contains DB favorite object
      const favorite = await response.json();
      console.log('✅ Favorite successfully saved to backend:', favorite);
      return favorite;
    } catch (error) {
      console.error('Error calling /favorites endpoint:', error);
      throw error;
    }
  }

  // --- Utility Functions ---
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showLoading() {
    loadingState.style.display = 'block';
    jobList.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
  }

  function hideLoading() {
    loadingState.style.display = 'none';
    jobList.style.display = '';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorState.style.display = 'block';
    jobList.style.display = 'none';
    emptyState.style.display = 'none';
  }

  function hideError() {
    errorState.style.display = 'none';
  }

  function showEmptyState(message) {
    if (emptyState) {
      emptyState.textContent = message || 'No jobs found.';
      emptyState.style.display = 'block';
    }
  }

  function hideEmptyState() {
    if (emptyState) {
      emptyState.style.display = 'none';
    }
  }

  // --- Event Listeners ---
  searchJobsBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (!city) {
      showError('Please enter a city name.');
      return;
    }
    currentCity = city;
    fetchJobs(city, 1);
  });

  // Allow Enter key to search
  cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchJobsBtn.click();
    }
  });

  // Refresh button
  refreshBtn.addEventListener('click', () => {
    if (currentCity) {
      fetchJobs(currentCity, 1);
    } else {
      showError('Please enter a city first.');
    }
  });

  // Auto-load jobs on page load if city is set
  if (currentCity) {
    fetchJobs(currentCity, 1);
  }
});
