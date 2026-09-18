import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { imsakiye } from '../imsakiye';
import { CityService } from '../city.service';

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

  constructor(private cityService: CityService) {}

  ngOnInit() {
    this.citySub = this.cityService.city$.subscribe(() => this.buildDays());
  }

  ngOnDestroy() {
    if (this.citySub) {
      this.citySub.unsubscribe();
    }
  }

  private buildDays() {
    this.city = this.cityService.city;
    let data = imsakiye[this.city];
    let todayDateTime = moment();
    let todayDate = todayDateTime.format('YYYY-MM-DD');

    this.days = data.map((item) => {
      let m = moment(item.date, 'YYYY-MM-DD');
      return {
        day: item.day,
        dateLabel: `${m.date()} ${AY_ADLARI_TR[m.month()]}`,
        weekdayLabel: GUN_ADLARI_TR[m.day()],
        start: item.start,
        end: item.end,
        isToday: item.date === todayDate,
        isPast: m.isBefore(todayDateTime, 'day'),
      };
    });
  }
}
