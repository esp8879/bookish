import { registerSW } from 'virtual:pwa-register';

/** True once a new build is installed and waiting, in case it happened before the UI mounted. */
export let updateReady = false;
let registration: ServiceWorkerRegistration | undefined;

/** Registers the service worker and announces new builds via a window event. */
const updateSW = registerSW({
  onNeedRefresh() { updateReady = true; window.dispatchEvent(new CustomEvent('books:update')); },
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    registration = reg;
    // Check for a new build hourly and whenever the app comes back to the foreground.
    setInterval(() => void reg.update(), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reg.update(); });
  },
});

/**
 * Switch to the waiting build and reload. The plugin's own updateSW(true) only reloads for builds
 * workbox classifies as an "update"; on iOS home-screen apps they often arrive as "external", the new
 * worker takes over and nothing reloads. So: tell the waiting worker to take over, reload when it
 * does, and reload anyway after a moment so the button never does nothing.
 */
export async function applyUpdate() {
  let done = false;
  const reload = () => { if (!done) { done = true; location.reload(); } };
  navigator.serviceWorker?.addEventListener('controllerchange', reload);
  const reg = registration ?? (await navigator.serviceWorker?.getRegistration());
  if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  else void updateSW(false);
  setTimeout(reload, 2500);
}
