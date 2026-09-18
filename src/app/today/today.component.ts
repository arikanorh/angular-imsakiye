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

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class TodayComponent implements OnInit, OnDestroy {
  datas = imsakiye;

  day: string = '';
  date = '';
  start = '';
  end = '';
  remaining;
  remainingLabel = '';
  showRemainingCountdown = true;
  sahurPassed;
  iftarPassed;
  progressPercent = 0;
  dayProgressPercent = 0;

  showRamadanCountdown = false;
  daysUntilRamadan = 0;
  ramadanProgressPercent = 0;
  todayShortLabel = '';
  ramadanStartShortLabel = '';

  private citySub: Subscription;
  private timer;

  constructor(private cityService: CityService) {}

  get progressGradient(): string {
    return `linear-gradient(90deg, #0f7b6c 0%, #0f7b6c ${this.progressPercent}%, #d8e6e2 ${this.progressPercent}%, #d8e6e2 100%)`;
  }

  get trackDotPercent(): number {
    // Uçlardaki sahur/iftar ikonlarıyla çakışmasın diye görsel olarak içeri çekiyoruz.
    return Math.min(94, Math.max(6, this.progressPercent));
  }

  get ramadanTrackDotPercent(): number {
    return Math.min(94, Math.max(6, this.ramadanProgressPercent));
  }

  get ramadanProgressGradient(): string {
    return `linear-gradient(90deg, #0f7b6c 0%, #0f7b6c ${this.ramadanProgressPercent}%, #d8e6e2 ${this.ramadanProgressPercent}%, #d8e6e2 100%)`;
  }

  private formatDisplayDate(m: moment.Moment): string {
    return `${m.date()} ${AY_ADLARI_TR[m.month()]} ${m.year()} · ${m.format('HH:mm:ss')}`;
  }

  private formatShortDate(m: moment.Moment): string {
    return `${m.date()} ${AY_ADLARI_TR[m.month()].slice(0, 3)}`;
  }

  ngOnInit() {
    this.citySub = this.cityService.city$.subscribe(() => this.calc());

    this.timer = setInterval(() => this.calc(), 1000);
    this.calc();
  }

  ngOnDestroy() {
    if (this.citySub) {
      this.citySub.unsubscribe();
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  calc() {
    let data = this.datas[this.cityService.city];
    let format = 'YYYY-MM-DD HH:mm:ss';
    let todayDateTime = moment();

    let todayDate = todayDateTime.format('YYYY-MM-DD');

    let index = 0;
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      if (item.date === todayDate) {
        index = i;
      }
    }

    let today = data[index];
    let next = data[index + 1];

    let ramadanStartDateTime = moment(
      data[0].date + ' ' + data[0].start,
      format
    );
    this.daysUntilRamadan = Math.ceil(
      moment.duration(ramadanStartDateTime.diff(todayDateTime)).asDays()
    );
    this.showRamadanCountdown = this.daysUntilRamadan > 30;
    if (this.showRamadanCountdown) {
      this.todayShortLabel = this.formatShortDate(todayDateTime);
      this.ramadanStartShortLabel = this.formatShortDate(ramadanStartDateTime);
      this.ramadanProgressPercent = Math.min(
        100,
        Math.max(0, ((365 - this.daysUntilRamadan) / 365) * 100)
      );
    }

    let sahurDateTimeStr = today.date + ' ' + today.start;
    let iftarDateTimeStr = today.date + ' ' + today.end;
    let sahurDateTime = moment(sahurDateTimeStr, format);
    let iftarDateTime = moment(iftarDateTimeStr, format);

    let sahurPassed: boolean = todayDateTime.isAfter(sahurDateTime);
    let iftarPassed: boolean = todayDateTime.isAfter(iftarDateTime);

    if (iftarPassed && !next) {
      // Takvimdeki son günün iftarı geçti; bir sonraki gün verisi yok
      // (Ramazan bitti). Sayacı burada dondurup çökmeyi/NaN'i önlüyoruz.
      this.date = this.formatDisplayDate(todayDateTime);
      this.day = today.day + '/' + data.length;
      this.start = today.start;
      this.end = today.end;
      this.sahurPassed = true;
      this.iftarPassed = true;
      this.remaining = '00:00:00';
      this.remainingLabel = 'İftara kalan';
      this.showRemainingCountdown = true;
      this.progressPercent = 100;
      this.dayProgressPercent = (Number(today.day) / data.length) * 100;
      return;
    }

    let nextDay: boolean = false;

    if (iftarPassed) {
      today = next;
      nextDay = true;
    }

    sahurDateTimeStr = today.date + ' ' + today.start;
    iftarDateTimeStr = today.date + ' ' + today.end;
    sahurDateTime = moment(sahurDateTimeStr, format);
    iftarDateTime = moment(iftarDateTimeStr, format);

    this.date = this.formatDisplayDate(todayDateTime);
    this.day = today.day + '/' + data.length;
    this.start = today.start;
    this.end = today.end;
    this.dayProgressPercent = (Number(today.day) / data.length) * 100;

    sahurPassed = todayDateTime.isAfter(sahurDateTime);
    iftarPassed = todayDateTime.isAfter(iftarDateTime);

    if (nextDay) {
      this.sahurPassed = true;
      this.iftarPassed = true;
    } else {
      this.sahurPassed = todayDateTime.isAfter(sahurDateTime);
      this.iftarPassed = iftarPassed;
    }

    let totalSpan = iftarDateTime.diff(sahurDateTime);
    let elapsed = todayDateTime.diff(sahurDateTime);
    let progress = totalSpan > 0 ? (elapsed / totalSpan) * 100 : 0;
    this.progressPercent = Math.min(100, Math.max(0, progress));

    let subjectDateTime = sahurDateTime;
    if (sahurPassed) {
      subjectDateTime = iftarDateTime;
    }
    this.remainingLabel = sahurPassed ? 'İftara kalan' : 'Sahura kalan';
    let remainingSeconds = moment
      .duration(subjectDateTime.diff(todayDateTime))
      .as('seconds');
    this.showRemainingCountdown = remainingSeconds <= 24 * 60 * 60;
    this.remaining = this.convertToXXHoursYYMinutes(remainingSeconds);
  }

  convertToXXHoursYYMinutes(seconds) {
    seconds = Math.floor(seconds);
    let hour = Math.floor(seconds / (60 * 60));
    let minutes = Math.floor((seconds % (60 * 60)) / 60);
    let secs = seconds % 60;

    return (
      this.padZero(hour) + ':' + this.padZero(minutes) + ':' + this.padZero(secs)
    );
  }

  padZero(number) {
    if (number < 10) return '0' + number;
    else return number;
  }
}
