import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, AfterViewInit } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { imsakiye, bayramNamazi } from '../imsakiye';
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
  isToday: boolean;
  isPast: boolean;
  isFriday: boolean;
  /** "Kadir Gecesi", "Arife" gibi gün notu. */
  note: string;
  isKadir: boolean;
}

interface BayramGunu {
  day: number;
  dateLabel: string;
  weekdayLabel: string;
  isToday: boolean;
  isPast: boolean;
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
  /** Özet alt satırı: "29 gün · bugün 12 sa 05 dk oruç" / "Ramazan'a 60 gün · 8 Şubat – 8 Mart" */
  summaryLine = '';
  hasToday = false;
  bayram: BayramGunu[] = [];
  /** Bayramın 1. günü namaz saati; veri girilmemişse null. */
  bayramNamaziSaati: string | null = null;

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

    let lastIndex = data.length - 1;
    this.days = data.map((item, i) => {
      let m = moment(item.date, 'YYYY-MM-DD');
      // Diyanet takvimi Kadir Gecesi'ni 26. günün tarihine yazar (o günün
      // iftarıyla başlayan gece). Son gün Arife'dir.
      let isKadir = i === 25 && data.length >= 27;
      let note = isKadir ? 'Kadir Gecesi' : i === lastIndex ? 'Arife' : '';
      return {
        day: item.day,
        dateLabel: `${m.date()} ${AY_ADLARI_TR[m.month()]}`,
        weekdayLabel: GUN_ADLARI_TR[m.day()],
        start: item.start,
        end: item.end,
        isToday: item.date === todayDate,
        isPast: m.isBefore(todayDateTime, 'day'),
        isFriday: m.day() === 5,
        note,
        isKadir,
      };
    });

    this.bayramNamaziSaati = bayramNamazi[this.city] ?? null;
    let last = moment(data[lastIndex].date, 'YYYY-MM-DD');
    this.bayram = [1, 2, 3].map((n) => {
      let m = last.clone().add(n, 'days');
      return {
        day: n,
        dateLabel: `${m.date()} ${AY_ADLARI_TR[m.month()]}`,
        weekdayLabel: GUN_ADLARI_TR[m.day()],
        isToday: m.format('YYYY-MM-DD') === todayDate,
        isPast: m.isBefore(todayDateTime, 'day'),
      };
    });

    this.hasToday = this.days.some((d) => d.isToday) || this.bayram.some((d) => d.isToday);
    this.totalDays = data.length;
    let first = moment(data[0].date, 'YYYY-MM-DD');
    // Ramazan'ın ortasındaki bir gün hicri yılı güvenle verir.
    this.hijriYear = this.hijriYearOf(moment(data[Math.floor(data.length / 2)].date, 'YYYY-MM-DD'));
    let rangeLabel = `${first.date()} ${AY_ADLARI_TR[first.month()]} – ${last.date()} ${AY_ADLARI_TR[last.month()]}`;

    let todayEntry = data.find((d) => d.date === todayDate);
    if (todayEntry) {
      // Süre sütunu kaldırıldı; bugünün oruç süresi özet satırında.
      let sahur = moment(todayEntry.date + ' ' + todayEntry.start, 'YYYY-MM-DD HH:mm');
      let iftar = moment(todayEntry.date + ' ' + todayEntry.end, 'YYYY-MM-DD HH:mm');
      let totalMinutes = iftar.diff(sahur, 'minutes');
      this.summaryLine = `${data.length} gün · bugün ${Math.floor(totalMinutes / 60)} sa ${String(totalMinutes % 60).padStart(2, '0')} dk oruç`;
    } else if (todayDateTime.isBefore(first, 'day')) {
      let daysLeft = first.diff(todayDateTime.clone().startOf('day'), 'days');
      this.summaryLine = `Ramazan'a ${daysLeft} gün · ${rangeLabel}`;
    } else {
      this.summaryLine = `${data.length} gün · ${rangeLabel}`;
    }

    this.weeks = [];
    for (let i = 0; i < this.days.length; i += 7) {
      this.weeks.push({
        label: `${i / 7 + 1}. hafta`,
        days: this.days.slice(i, i + 7),
      });
    }
  }
}
