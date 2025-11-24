document.addEventListener('DOMContentLoaded', function () {
  const openBtn = document.getElementById('cv-signin-open');
  const overlay = document.getElementById('cv-auth-overlay');
  const closeBtn = document.getElementById('cv-auth-close');
  const form = document.querySelector('.cv-auth-form');

  if (!openBtn || !overlay) {
    return;
  }

  function openModal() {
    overlay.classList.add('show');
  }

  function closeModal() {
    overlay.classList.remove('show');
  }

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

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Здесь можно было бы дергать бэкенд логина.
      // Сейчас просто закрываем модалку как демо.
      closeModal();
    });
  }
});
