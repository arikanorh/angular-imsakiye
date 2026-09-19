import './polyfills';

import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

enableProdMode();

// iOS Safari'de yerel uygulama hissi için CSS'in engellemediği birkaç
// hareket. Bunlar kaydırmayla ilgisi olmayan, seyrek olaylar; performansa
// etkisi yoktur. (Dokunuşun kendisini iptal etme işi, kaydırma gerektirmeyen
// alanlarda ilgili bileşenlerde yapılır: TodayComponent ve üst kart.)
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
document.addEventListener('contextmenu', (e) => {
  if (!isEditable(e.target)) {
    e.preventDefault();
  }
});

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
