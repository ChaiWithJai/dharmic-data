(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const elements = [...document.querySelectorAll('[data-animation-type="rive"]')];
  if (preference.matches) elements.forEach(element => element.setAttribute('data-rive-autoplay', 'false'));
  const apply = () => {
    const runtime = window.Webflow?.require?.('rive');
    for (const element of elements) {
      const instance = runtime?.getInstance(element)?.rive;
      if (!instance) continue;
      if (preference.matches) instance.pause();
      else if (element.dataset.riveStateMachine) instance.play(element.dataset.riveStateMachine);
    }
  };
  preference.addEventListener('change', apply);
  document.addEventListener('w-rive-load', apply);
  window.addEventListener('load', () => {
    apply();
    // The vendored runtime and its WASM initialize after the page is ready.
    let attempts = 0;
    const timer = setInterval(() => {
      if (preference.matches) apply();
      if (++attempts >= 30) clearInterval(timer);
    }, 500);
  }, { once: true });
})();
