import { Component, OnDestroy, OnInit } from '@angular/core';
import moment from 'moment';
import { imsakiye } from '../imsakiye';
import { CityService } from '../city.service';
import { SimTimeService } from '../sim-time.service';

const AY_ADLARI_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const DAYS_BEFORE = 60;
const DAYS_AFTER = 5;

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  standalone: false,
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  isOpen = false;

  timeOfDay = '10:00';
  dayOffset = -DAYS_BEFORE;

  minOffset = -DAYS_BEFORE;
  maxOffset: number;

  private ramadanStart: moment.Moment;
  private totalDays: number;

  private refreshTimer;

  constructor(
    private cityService: CityService,
    public simTime: SimTimeService
  ) {
    const data = imsakiye[this.cityService.city];
    this.ramadanStart = moment(data[0].date, 'YYYY-MM-DD');
    this.totalDays = data.length;
    this.maxOffset = this.totalDays - 1 + DAYS_AFTER;
  }

  ngOnInit() {
    // Panel kapalıyken de her saniye tazelenerek "gerçek zaman" göstergesi
    // güncel kalır (başka bileşenin zamanlayıcısına bağımlı olmadan).
    this.refreshTimer = setInterval(() => {}, 1000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
  }

  private get selectedMoment(): moment.Moment {
    const [h, m] = this.timeOfDay.split(':').map(Number);
    return this.ramadanStart
      .clone()
      .add(this.dayOffset, 'days')
      .hour(h || 0)
      .minute(m || 0)
      .second(0);
  }

  get readoutDate(): string {
    const m = this.selectedMoment;
    return `${m.date()} ${AY_ADLARI_TR[m.month()]} ${m.year()}`;
  }

  get statusLabel(): string {
    if (this.dayOffset < 0) {
      return `Ramazan'a ${-this.dayOffset} gün kala`;
    }
    if (this.dayOffset < this.totalDays) {
      return `Ramazan'ın ${this.dayOffset + 1}. günü`;
    }
    return `Bitişten ${this.dayOffset - this.totalDays + 1} gün sonra`;
  }

  onOffsetChange(value: string) {
    this.dayOffset = Number(value);
    this.simTime.set(this.selectedMoment);
  }

  onTimeChange(value: string) {
    if (!value) {
      return;
    }
    this.timeOfDay = value;
    this.simTime.set(this.selectedMoment);
  }

  resetToReal() {
    this.dayOffset = -DAYS_BEFORE;
    this.timeOfDay = '10:00';
    this.simTime.reset();
  }
}
