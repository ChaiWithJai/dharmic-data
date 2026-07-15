(() => {
  const MOBILE_MAX = 991;

  document.querySelectorAll('.navbar').forEach((navbar, index) => {
    const button = navbar.querySelector('.menu-button');
    const menu = navbar.querySelector('.menu-wrapper');
    if (!button || !menu) return;

    const menuId = menu.id || `site-menu-${index + 1}`;
    menu.id = menuId;
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-controls', menuId);

    const setOpen = (open, restoreFocus = false) => {
      const mobile = window.innerWidth <= MOBILE_MAX;
      const next = mobile && open;
      button.classList.toggle('w--open', next);
      button.setAttribute('aria-expanded', String(next));
      if (next) {
        menu.setAttribute('data-nav-menu-open', '');
        menu.hidden = false;
      } else {
        menu.removeAttribute('data-nav-menu-open');
        menu.hidden = mobile;
        if (restoreFocus) button.focus();
      }
    };

    setOpen(false);

    button.addEventListener('click', (event) => {
      if (window.innerWidth > MOBILE_MAX) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(button.getAttribute('aria-expanded') !== 'true');
    }, true);

    document.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === button && window.innerWidth <= MOBILE_MAX) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(button.getAttribute('aria-expanded') !== 'true');
        return;
      }
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false, true);
      }
    }, true);

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a') && window.innerWidth <= MOBILE_MAX) setOpen(false);
    });

    window.addEventListener('resize', () => setOpen(false));
  });
})();
