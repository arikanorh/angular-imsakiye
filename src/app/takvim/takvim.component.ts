import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
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

const GUN_ADLARI_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

interface TakvimGunu {
  day: string;
  dateLabel: string;
  weekdayLabel: string;
  start: string;
  end: string;
  durationLabel: string;
  isToday: boolean;
  isPast: boolean;
}

@Component({
  selector: 'app-takvim',
  templateUrl: './takvim.component.html',
  styleUrls: ['./takvim.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class TakvimComponent implements OnInit, OnDestroy {
  city: string;
  days: TakvimGunu[] = [];

  private citySub: Subscription;
  private simTimeSub: Subscription;

  constructor(
    private cityService: CityService,
    private simTime: SimTimeService
  ) {}

  ngOnInit() {
    this.citySub = this.cityService.city$.subscribe(() => this.buildDays());
    this.simTimeSub = this.simTime.override$.subscribe(() => this.buildDays());
  }

  ngOnDestroy() {
    if (this.citySub) {
      this.citySub.unsubscribe();
    }
    if (this.simTimeSub) {
      this.simTimeSub.unsubscribe();
    }
  }

  private buildDays() {
    this.city = this.cityService.city;
    let data = imsakiye[this.city];
    let todayDateTime = this.simTime.now();
    let todayDate = todayDateTime.format('YYYY-MM-DD');

    this.days = data.map((item) => {
      let m = moment(item.date, 'YYYY-MM-DD');
      let sahur = moment(item.date + ' ' + item.start, 'YYYY-MM-DD HH:mm');
      let iftar = moment(item.date + ' ' + item.end, 'YYYY-MM-DD HH:mm');
      let totalMinutes = iftar.diff(sahur, 'minutes');
      let hours = Math.floor(totalMinutes / 60);
      let minutes = totalMinutes % 60;
      return {
        day: item.day,
        dateLabel: `${m.date()} ${AY_ADLARI_TR[m.month()]}`,
        weekdayLabel: GUN_ADLARI_TR[m.day()],
        start: item.start,
        end: item.end,
        durationLabel: `${hours}s ${String(minutes).padStart(2, '0')}dk`,
        isToday: item.date === todayDate,
        isPast: m.isBefore(todayDateTime, 'day'),
      };
    });
  }
}
