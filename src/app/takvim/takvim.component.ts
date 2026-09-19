import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, AfterViewInit } from '@angular/core';
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
  isFriday: boolean;
}

interface TakvimHaftasi {
  label: string;
  days: TakvimGunu[];
}

@Component({
  selector: 'app-takvim',
  templateUrl: './takvim.component.html',
  styleUrls: ['./takvim.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class TakvimComponent implements OnInit, AfterViewInit, OnDestroy {
  city: string;
  days: TakvimGunu[] = [];
  weeks: TakvimHaftasi[] = [];

  hijriYear = '';
  totalDays = 0;
  rangeLabel = '';
  hasToday = false;

  private citySub: Subscription;
  private simTimeSub: Subscription;

  constructor(
    private cityService: CityService,
    private simTime: SimTimeService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    this.citySub = this.cityService.city$.subscribe(() => this.buildDays());
    this.simTimeSub = this.simTime.override$.subscribe(() => {
      this.buildDays();
      setTimeout(() => this.scrollToToday('auto'));
    });
  }

  ngAfterViewInit() {
    // Açılışta bugünün satırı ortada gelsin.
    setTimeout(() => this.scrollToToday('auto'));
  }

  scrollToToday(behavior: ScrollBehavior = 'smooth') {
    const row = this.host.nativeElement.querySelector('.takvim-row.today');
    if (row) {
      row.scrollIntoView({ block: 'center', behavior });
    }
  }

  /** Hicri yıl (Umm al-Qura takvimi). Desteklenmeyen tarayıcıda boş kalır
   *  ve başlık yalnızca "Ramazan" olur. */
  private hijriYearOf(date: moment.Moment): string {
    try {
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).formatToParts(date.toDate());
      const year = parts.find((p) => p.type === 'year');
      return year ? year.value : '';
    } catch {
      return '';
    }
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
        durationLabel: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        isToday: item.date === todayDate,
        isPast: m.isBefore(todayDateTime, 'day'),
        isFriday: m.day() === 5,
      };
    });

    this.hasToday = this.days.some((d) => d.isToday);
    this.totalDays = data.length;
    let first = moment(data[0].date, 'YYYY-MM-DD');
    let last = moment(data[data.length - 1].date, 'YYYY-MM-DD');
    // Ramazan'ın ortasındaki bir gün hicri yılı güvenle verir.
    this.hijriYear = this.hijriYearOf(moment(data[Math.floor(data.length / 2)].date, 'YYYY-MM-DD'));
    this.rangeLabel = `${first.date()} ${AY_ADLARI_TR[first.month()]} – ${last.date()} ${AY_ADLARI_TR[last.month()]}`;

    this.weeks = [];
    for (let i = 0; i < this.days.length; i += 7) {
      this.weeks.push({
        label: `${i / 7 + 1}. hafta`,
        days: this.days.slice(i, i + 7),
      });
    }
  }
}
