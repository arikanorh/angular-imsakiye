import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { buildInfo } from './build-info';
import moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { CityService } from './city.service';
import { ThemeMode, ThemeService } from './theme.service';

@Component({
    selector: 'my-app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class AppComponent implements OnInit {
  cities: string[];

  buildVersion = buildInfo.version;
  buildBranch = buildInfo.branch;
  buildTimestamp =
    buildInfo.timestamp === 'unbuilt'
      ? buildInfo.timestamp
      : moment(buildInfo.timestamp).format('YYYY-MM-DD HH:mm');

  updateAvailable = false;

  /** Mobil zaman simülasyonu barı; "Hakkında" sayfasındaki anahtar kontrol eder. */
  simPanelOpen = false;

  /** Markaya uzun basışla açılan "Hakkında" sayfası. */
  aboutOpen = false;
  private brandPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private swUpdate: SwUpdate,
    private cityService: CityService,
    private theme: ThemeService
  ) {
    this.cities = cityService.cities;
  }

  get themeMode(): ThemeMode {
    return this.theme.mode;
  }

  setTheme(mode: ThemeMode) {
    this.theme.setMode(mode);
  }

  startBrandPress(event: PointerEvent) {
    this.cancelBrandPress();
    this.brandPressTimer = setTimeout(() => {
      this.brandPressTimer = null;
      this.aboutOpen = true;
    }, 500);
  }

  cancelBrandPress() {
    if (this.brandPressTimer) {
      clearTimeout(this.brandPressTimer);
      this.brandPressTimer = null;
    }
  }

  closeAbout() {
    this.aboutOpen = false;
  }

  get city(): string {
    return this.cityService.city;
  }

  set city(value: string) {
    this.cityService.setCity(value);
  }

  reloadForUpdate() {
    document.location.reload();
  }

  private watchForUpdates() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable = true;
      }
    });

    this.swUpdate.checkForUpdate();

    // iOS'ta PWA arka plandan öne geldiğinde de tekrar kontrol et
    // (sekme uzun süre açık/askıda kalmış olabilir).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.swUpdate.checkForUpdate();
      }
    });
  }

  ngOnInit() {
    this.watchForUpdates();

    this.route.queryParams.subscribe((e) => {
      if (e.city && this.cities.includes(e.city)) {
        this.cityService.setCity(e.city);
      }
    });
  }
}
