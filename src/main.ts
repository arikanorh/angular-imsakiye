import './polyfills';

import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

enableProdMode();

// iOS Safari'de yerel uygulama hissi için CSS'in tek başına engellemediği
// hareketler: iki parmakla yakınlaştırma (gesturestart), çift dokunma ile
// yakınlaştırma (art arda iki touchend) ve metin seçimi büyüteci
// (selectstart). Yazı girilen alanlar bundan muaf.
const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
document.addEventListener('selectstart', (e) => {
  if (!isEditable(e.target)) {
    e.preventDefault();
  }
});

let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 350 && !isEditable(e.target)) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false }
);

platformBrowserDynamic()
  .bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .then((ref) => {
    // Ensure Angular destroys itself on hot reloads.
    if (window['ngRef']) {
      window['ngRef'].destroy();
    }
    window['ngRef'] = ref;

    // Otherwise, log the boot error
  })
  .catch((err) => console.error(err));
