import { Injectable } from '@angular/core';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { imsakiye } from './imsakiye';
import { CityService } from './city.service';
import { SimTimeService } from './sim-time.service';

export type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'imsakiye-theme';
const LIGHT_THEME_COLOR = '#eaf6f4';
const DARK_THEME_COLOR = '#10302a';
/** Sahur (imsak) ile gün doğumu arası yaklaşık fark; otomatik modda
 *  karanlık palet sahurdan bu kadar sonra açığa döner. */
const SUNRISE_AFTER_SAHUR_MINUTES = 90;

/**
 * Açık / Koyu / Otomatik tema. Otomatik: Ramazan'da iftardan gün doğumuna
 * (sahur + 90 dk) kadar koyu; takvim dışı günlerde 19:30–06:30 arası koyu.
 * Palet html[data-theme] üzerinden CSS değişkenleriyle uygulanır.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private modeSubject = new BehaviorSubject<ThemeMode>(this.readStoredMode());
  mode$ = this.modeSubject.asObservable();

  isDark = false;

  constructor(
    private cityService: CityService,
    private simTime: SimTimeService
  ) {
    this.apply();
    this.simTime.override$.subscribe(() => this.apply());
    this.cityService.city$.subscribe(() => this.apply());
    setInterval(() => this.apply(), 30 * 1000);
  }

  get mode(): ThemeMode {
    return this.modeSubject.value;
  }

  setMode(mode: ThemeMode) {
    this.modeSubject.next(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Gizli sekme / engellenmiş depolama: tercih yalnızca bu oturumda kalır.
    }
    this.apply();
  }

  private readStoredMode(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        return stored;
      }
    } catch {
      // yoksay
    }
    return 'auto';
  }

  private isNightNow(now: moment.Moment): boolean {
    const data = imsakiye[this.cityService.city];
    const todayDate = now.format('YYYY-MM-DD');
    const entry = data.find((d) => d.date === todayDate);
    if (entry) {
      const sunrise = moment(entry.date + ' ' + entry.start, 'YYYY-MM-DD HH:mm').add(
        SUNRISE_AFTER_SAHUR_MINUTES,
        'minutes'
      );
      const iftar = moment(entry.date + ' ' + entry.end, 'YYYY-MM-DD HH:mm');
      return now.isBefore(sunrise) || now.isAfter(iftar);
    }
    const minutes = now.hour() * 60 + now.minute();
    return minutes >= 19 * 60 + 30 || minutes < 6 * 60 + 30;
  }

  apply() {
    const mode = this.mode;
    const dark = mode === 'dark' || (mode === 'auto' && this.isNightNow(this.simTime.now()));
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next = dark ? 'dark' : 'light';
    if (current === next) {
      return;
    }
    this.isDark = dark;
    root.setAttribute('data-theme', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }
  }
}
