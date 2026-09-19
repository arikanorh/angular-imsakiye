import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { buildInfo } from './build-info';
import moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { CityService } from './city.service';

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

  /** Geçici: mobil zaman simülasyonu barını açar/kapatır (varsayılan kapalı). */
  simPanelOpen = false;

  constructor(
    private route: ActivatedRoute,
    private swUpdate: SwUpdate,
    private cityService: CityService
  ) {
    this.cities = cityService.cities;
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
