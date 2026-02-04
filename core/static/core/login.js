// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Authentication state
let isRegisterMode = false;
let isCheckingAuth = false; // Prevent multiple simultaneous auth checks
let currentUser = null; // Cache user data

document.addEventListener('DOMContentLoaded', function () {
  const openBtn = document.getElementById('cv-signin-open');
  const overlay = document.getElementById('cv-auth-overlay');
  const closeBtn = document.getElementById('cv-auth-close');
  const form = document.getElementById('cv-auth-form');
  const toggleModeBtn = document.getElementById('cv-auth-toggle-mode');
  const titleEl = document.getElementById('cv-auth-title');
  const subtitleEl = document.getElementById('cv-auth-subtitle');
  const submitBtn = document.getElementById('cv-auth-submit-btn');
  const errorEl = document.getElementById('cv-auth-error');

  // Stop code early if requirements not met
  if (!openBtn || !overlay || !form) {
    return;
  }

  // Modal controls
  function openModal() {
    overlay.classList.add('show');
    // Reset form when opening
    resetForm();
  }

  function closeModal() {
    overlay.classList.remove('show');
    resetForm();
  }

  function resetForm() {
    form.reset();
    hideError();
    isRegisterMode = false;
    updateUI();
  }

  function updateUI() {
  if (isRegisterMode) {
    titleEl.textContent = I18N.register;
    subtitleEl.textContent = I18N.registerSubtitle;
    submitBtn.textContent = I18N.register;
    toggleModeBtn.textContent = I18N.signIn;
  } else {
    titleEl.textContent = I18N.signIn;
    subtitleEl.textContent = I18N.signInSubtitle;
    submitBtn.textContent = I18N.signIn;
    toggleModeBtn.textContent = I18N.register;
  }
}

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    errorEl.className = 'cv-auth-error';
  }

  function showSuccess(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    errorEl.className = 'cv-auth-success';
  }

  function hideError() {
    errorEl.style.display = 'none';
  }

  // Event listeners
  openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Toggle between login and register
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
      isRegisterMode = !isRegisterMode;
      updateUI();
      hideError();
    });
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = document.getElementById('cv-auth-username').value.trim();
    const password = document.getElementById('cv-auth-password').value;

    if (!username || !password) {
      showError('Please fill in all fields.');
      return;
    }

    // Disable submit button during request
    submitBtn.disabled = true;
    submitBtn.textContent = isRegisterMode ? 'Registering...' : 'Signing in...';

    try {
      if (isRegisterMode) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (error) {
      showError(error.message || 'An error occurred. Please try again.');
      submitBtn.disabled = false;
      updateUI();
    }
  });

  // API Functions
  async function register(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      // Registration successful, now login
      showSuccess('Registration successful! Logging you in...');
      await login(username, password);
    } catch (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Username already exists. Please choose another.');
      }
      throw error;
    }
  }

  async function login(username, password) {
    // Login endpoint uses application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    // Show success and close modal
    showSuccess('Successfully authenticated!');
    
    // Clear cached user data to force fresh fetch
    currentUser = null;
    
    // Close modal after short delay
    setTimeout(() => {
      closeModal();
      // Reload to update UI
      window.location.reload();
    }, 1000);
  }

  // Token refresh function (for use in other parts of the app)
  async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Refresh token expired, clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      updateAuthUI(false);
      throw new Error('Session expired. Please login again.');
    }

    // Update stored tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    return data;
  }

  // Logout function
  async function logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    currentUser = null; // Clear cached user data
    updateAuthUI(false);
  }

  // Update UI based on auth state
  function updateAuthUI(isAuthenticated, userData = null) {
    const signInBtn = document.getElementById('cv-signin-open');
    if (signInBtn) {
      if (isAuthenticated && userData) {
        // Update sign in button to show username or logout
        signInBtn.textContent = `${userData.username} (${I18N.logout})`;
        signInBtn.onclick = async (e) => {
          e.preventDefault();
          await logout();
          window.location.reload();
        };
      } else {
        signInBtn.textContent = I18N.signIn;
        signInBtn.onclick = (e) => {
          e.preventDefault();
          openModal();
        };
      }
    }
  }

  // Check authentication status
  async function checkAuthStatus() {
    // Prevent multiple simultaneous calls
    if (isCheckingAuth) {
      return;
    }

    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) {
      currentUser = null;
      updateAuthUI(false);
      return;
    }

    // If we already have user data and token exists, use cached data
    if (currentUser) {
      updateAuthUI(true, currentUser);
      return;
    }

    isCheckingAuth = true;

    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        try {
          await refreshAccessToken();
          // Retry after refresh (only once)
          isCheckingAuth = false;
          return checkAuthStatus();
        } catch (error) {
          // Refresh failed, user needs to login
          currentUser = null;
          updateAuthUI(false);
          isCheckingAuth = false;
          return;
        }
      }

      if (response.ok) {
        const userData = await response.json();
        currentUser = userData; // Cache user data
        updateAuthUI(true, userData);
      } else {
        currentUser = null;
        updateAuthUI(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      currentUser = null;
      updateAuthUI(false);
    } finally {
      isCheckingAuth = false;
    }
  }

  // Check auth status on page load
  checkAuthStatus();

  // Export functions for use in other scripts
  window.authAPI = {
    refreshAccessToken,
    logout,
    checkAuthStatus,
    getAccessToken: () => localStorage.getItem('access_token'),
    getRefreshToken: () => localStorage.getItem('refresh_token'),
    isAuthenticated: () => !!localStorage.getItem('access_token'),
  };
});
