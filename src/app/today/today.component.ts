import { Component, HostListener, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { imsakiye } from '../imsakiye';
import { CityService } from '../city.service';
import { SimTimeService } from '../sim-time.service';

const GUN_ADLARI_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

/** Geri sayımda saniye yalnızca son bu kadar saniyede gösterilir. */
const SECONDS_VISIBLE_UNDER = 10 * 60;

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
  remaining = '';
  remainingLabel = '';
  /** "saat : dakika" ya da son 10 dakikada "saat : dakika : saniye". */
  remainingUnitLabel = 'saat : dakika';
  showRemainingCountdown = true;
  /** Kart üst satırı: "Ramazan'ın 3. günü" / "Ramazan'a 1 gün kala". */
  dayStatusLabel = '';
  weekdayLabel = '';
  /** Çizelge noktasının üstündeki saat balonu (HH:mm). */
  nowLabel = '';
  /** Çizelge uçlarındaki saatler (aralığın başı / sonu). */
  spanStartLabel = '';
  spanEndLabel = '';
  dayIndex = 0;
  /** İftardan sonra kutucuklar ertesi güne ait; başlığı ("Yarın · 11 Şubat Perşembe"). */
  tomorrowLabel = '';
  /** Kadir Gecesi (26. günün iftarından 27. günün sahuruna) sürüyorsa true. */
  isKadirNight = false;
  /** Ramazan'ın son 3 günü için üst satır rozeti; boşsa haftanın günü gösterilir. */
  lastDaysLabel = '';
  /** Bitiş kartı: "9–11 Mart" */
  bayramRangeLabel = '';
  sahurPassed;
  iftarPassed;
  progressPercent = 0;
  dayProgressPercent = 0;
  /** Çizelge şu an gece aralığını (iftar → sahur) gösteriyorsa true;
   *  uç ikonlar buna göre yer değiştirir. */
  nightSpan = false;

  showRamadanCountdown = false;
  ramadanStarted = false;
  ramadanEnded = false;
  totalDays = 0;
  nextRamadanYear = 0;
  daysUntilRamadan = 0;
  ramadanProgressPercent = 0;
  ramadanStartLabel = '';
  ramadanStartWeekday = '';
  firstDayStart = '';
  firstDayEnd = '';

  private citySub: Subscription;
  private simTimeSub: Subscription;
  private timer;

  constructor(
    private cityService: CityService,
    private simTime: SimTimeService
  ) {}

  get city(): string {
    return this.cityService.city;
  }

  /** Dolgu, noktayla aynı eşlenmiş konumda biter; böylece ikisi her
   *  zaman senkron kalır. */
  get progressGradient(): string {
    const p = this.trackDotPercent;
    return `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${p}%, var(--soft) ${p}%, var(--soft) 100%)`;
  }

  /** İlerlemeyi (%0-100) uçlardaki ikonlarla çakışmayan %6-94 bandına
   *  doğrusal eşler. Kırpma yerine eşleme yapıldığı için nokta aralığın
   *  başında/sonunda takılı kalmaz, ilk dakikadan itibaren hareket eder. */
  private toDotPercent(progress: number): number {
    const clamped = Math.min(100, Math.max(0, progress));
    return 6 + clamped * 0.88;
  }

  get trackDotPercent(): number {
    return this.toDotPercent(this.progressPercent);
  }

  get ramadanTrackDotPercent(): number {
    return this.toDotPercent(this.ramadanProgressPercent);
  }

  get ramadanProgressGradient(): string {
    const p = this.ramadanTrackDotPercent;
    return `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${p}%, var(--soft) ${p}%, var(--soft) 100%)`;
  }

  /** Üst satır saniyesiz: kahraman sayaçla yarışmasın. */
  private formatDisplayDate(m: moment.Moment): string {
    return `${m.date()} ${AY_ADLARI_TR[m.month()]} ${m.year()} · ${m.format('HH:mm')}`;
  }

  private formatLongDate(m: moment.Moment): string {
    return `${m.date()} ${AY_ADLARI_TR[m.month()]} ${m.year()}`;
  }

  private formatClock(m: moment.Moment): string {
    return m.format('H:mm');
  }

  /** "9–11 Mart" ya da ay değişiyorsa "28 Şubat – 2 Mart". */
  private formatDayRange(a: moment.Moment, b: moment.Moment): string {
    if (a.month() === b.month()) {
      return `${a.date()}–${b.date()} ${AY_ADLARI_TR[a.month()]}`;
    }
    return `${a.date()} ${AY_ADLARI_TR[a.month()]} – ${b.date()} ${AY_ADLARI_TR[b.month()]}`;
  }

  ngOnInit() {
    this.citySub = this.cityService.city$.subscribe(() => this.calc());
    this.simTimeSub = this.simTime.override$.subscribe(() => this.calc());

    this.timer = setInterval(() => this.calc(), 1000);
    this.calc();
  }

  ngOnDestroy() {
    if (this.citySub) {
      this.citySub.unsubscribe();
    }
    if (this.simTimeSub) {
      this.simTimeSub.unsubscribe();
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /** iOS: "dokun, sonra basılı tut" hareketi metin büyütecini / tek parmak
   *  yakınlaştırmayı tetikliyor. Bu sayfa kaydırılmadığı için dokunuşun
   *  varsayılanını burada iptal etmek kaydırma performansını etkilemez.
   *  İçerik nadiren de olsa taşıyorsa (çok kısa ekran) kaydırmaya izin
   *  vermek için dokunulmaz. */
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    const host = event.currentTarget as HTMLElement;
    const scroller = host.parentElement;
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
      return;
    }
    event.preventDefault();
  }

  calc() {
    let data = this.datas[this.cityService.city];
    let format = 'YYYY-MM-DD HH:mm:ss';
    let todayDateTime = this.simTime.now();

    let todayDate = todayDateTime.format('YYYY-MM-DD');
    this.ramadanStarted = todayDate >= data[0].date;
    this.ramadanEnded = todayDate > data[data.length - 1].date;

    if (this.ramadanEnded) {
      // Takvimdeki son günün ertesinden itibaren artık eşleşen bir gün
      // yok; aşağıdaki hesaplar anlamsız/negatif değerler üretir. Bunun
      // yerine kapanış kartını göstermek için burada duruyoruz.
      this.date = this.formatDisplayDate(todayDateTime);
      this.totalDays = data.length;
      let lastDay = moment(data[data.length - 1].date, 'YYYY-MM-DD');
      this.nextRamadanYear = lastDay.year() + 1;
      this.bayramRangeLabel = this.formatDayRange(lastDay.clone().add(1, 'day'), lastDay.clone().add(3, 'days'));
      this.showRamadanCountdown = false;
      this.showRemainingCountdown = false;
      return;
    }

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
    // İlk sahura 24 saatten az kalınca (daysUntilRamadan <= 1) bu kart
    // yerini alttaki canlı "sahura kalan" sayacına bırakır; o aralığa
    // kadar Ramazan'a kalan tüm günlerde bu kart gösterilir.
    this.showRamadanCountdown = this.daysUntilRamadan > 1;
    this.weekdayLabel = GUN_ADLARI_TR[todayDateTime.day()];
    if (this.showRamadanCountdown) {
      this.ramadanStartLabel = this.formatLongDate(ramadanStartDateTime);
      this.ramadanStartWeekday = GUN_ADLARI_TR[ramadanStartDateTime.day()];
      this.firstDayStart = data[0].start;
      this.firstDayEnd = data[0].end;
      // 30 günden fazla kala 365 gün üzerinden, 30 günden az kala ise
      // (daha belirgin bir ilerleme hissi için) 30 gün üzerinden ölçekle.
      let scale = this.daysUntilRamadan > 30 ? 365 : 30;
      this.ramadanProgressPercent = Math.min(
        100,
        Math.max(0, ((scale - this.daysUntilRamadan) / scale) * 100)
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
      this.remaining = '00:00';
      this.remainingUnitLabel = 'saat : dakika';
      this.remainingLabel = 'İftara kalan';
      this.showRemainingCountdown = true;
      this.progressPercent = 100;
      this.nightSpan = false;
      this.dayIndex = Number(today.day);
      this.totalDays = data.length;
      this.dayStatusLabel = `Ramazan'ın ${today.day}. günü`;
      this.nowLabel = todayDateTime.format('HH:mm');
      this.spanStartLabel = today.start;
      this.spanEndLabel = today.end;
      this.dayProgressPercent = (Number(today.day) / data.length) * 100;
      return;
    }

    // Takvim günü: üst satırdaki "Ramazan'ın N. günü" ve ilerleme çubuğu
    // bugünün tarihini izler; iftardan sonra gösterilen vakitler ise
    // ertesi güne geçer (aşağıda today = next).
    let calendarDay = today;

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
    this.dayIndex = Number(calendarDay.day);
    this.totalDays = data.length;
    this.dayProgressPercent = (Number(calendarDay.day) / data.length) * 100;
    this.dayStatusLabel = this.ramadanStarted
      ? `Ramazan'ın ${calendarDay.day}. günü`
      : `Ramazan'a ${Math.max(1, this.daysUntilRamadan)} gün kala`;
    this.nowLabel = todayDateTime.format('HH:mm');

    sahurPassed = todayDateTime.isAfter(sahurDateTime);
    iftarPassed = todayDateTime.isAfter(iftarDateTime);

    if (nextDay) {
      // Ertesi günün vakitleri henüz gelmedi; "geçti" stili yanıltıcı olur.
      this.sahurPassed = false;
      this.iftarPassed = false;
      let tomorrow = moment(today.date, 'YYYY-MM-DD');
      this.tomorrowLabel = `Yarın · ${tomorrow.date()} ${AY_ADLARI_TR[tomorrow.month()]} ${GUN_ADLARI_TR[tomorrow.day()]}`;
    } else {
      this.sahurPassed = todayDateTime.isAfter(sahurDateTime);
      this.iftarPassed = iftarPassed;
      this.tomorrowLabel = '';
    }

    // Kadir Gecesi: Diyanet takviminde 26. günün tarihine yazılır. Rozet
    // 26. günün sahurundan 27. günün sahuruna kadar (gün + gece) görünür.
    this.isKadirNight = false;
    if (data.length >= 27) {
      let kadirStart = moment(data[25].date + ' ' + data[25].start, format);
      let kadirEnd = moment(data[26].date + ' ' + data[26].start, format);
      this.isKadirNight = todayDateTime.isSameOrAfter(kadirStart) && todayDateTime.isBefore(kadirEnd);
    }

    // Son günler: takvim gününe göre "Son 3 gün" → "Son 2 gün · Yarın Arife"
    // → "Arife · Son gün". Kadir rozeti varsa o öncelikli.
    this.lastDaysLabel = '';
    if (this.ramadanStarted) {
      let remainingDays = data.length - Number(calendarDay.day) + 1;
      if (remainingDays === 3) {
        this.lastDaysLabel = 'Son 3 gün';
      } else if (remainingDays === 2) {
        this.lastDaysLabel = 'Son 2 gün · Yarın Arife';
      } else if (remainingDays === 1) {
        this.lastDaysLabel = 'Arife · Son gün';
      }
    }

    // Çizelge her zaman bir aralığı temsil eder: gündüz sahur→iftar,
    // gece ise (iftardan sonra ya da sahurdan önce) önceki iftar→sahur.
    // Gece yarısı geçişinin önemi yok; aralık iki vakit arasında ölçülür.
    let prevIftarDateTime: moment.Moment | null = null;
    if (nextDay) {
      // Akşam: az önce geride bıraktığımız günün iftarı.
      prevIftarDateTime = moment(data[index].date + ' ' + data[index].end, format);
    } else if (index > 0 && this.ramadanStarted) {
      // Sabaha karşı: bir önceki günün iftarı.
      let prev = data[index - 1];
      prevIftarDateTime = moment(prev.date + ' ' + prev.end, format);
    }

    let spanStart = sahurDateTime;
    let spanEnd = iftarDateTime;
    this.nightSpan = !sahurPassed;
    if (!sahurPassed) {
      spanEnd = sahurDateTime;
      // İlk sahurdan önce önceki iftar yoktur; sahura kalan son 24
      // saatlik pencere üzerinden ilerlet.
      spanStart = prevIftarDateTime ?? sahurDateTime.clone().subtract(24, 'hours');
    }

    let totalSpan = spanEnd.diff(spanStart);
    let elapsed = todayDateTime.diff(spanStart);
    let progress = totalSpan > 0 ? (elapsed / totalSpan) * 100 : 0;

    this.progressPercent = Math.min(100, Math.max(0, progress));
    // Uç etiketleri: 24 saatlik pencerede başlangıç bir vakit değil,
    // o yüzden boş bırakılır.
    this.spanStartLabel =
      !sahurPassed && !prevIftarDateTime ? '' : this.formatClock(spanStart);
    this.spanEndLabel = this.formatClock(spanEnd);

    let subjectDateTime = sahurDateTime;
    if (sahurPassed) {
      subjectDateTime = iftarDateTime;
    }
    this.remainingLabel = sahurPassed ? 'İftara kalan' : 'Sahura kalan';
    let remainingSeconds = moment
      .duration(subjectDateTime.diff(todayDateTime))
      .as('seconds');
    this.showRemainingCountdown = remainingSeconds <= 24 * 60 * 60;
    const showSeconds = remainingSeconds <= SECONDS_VISIBLE_UNDER;
    this.remaining = this.formatRemaining(remainingSeconds, showSeconds);
    this.remainingUnitLabel = showSeconds ? 'saat : dakika : saniye' : 'saat : dakika';
  }

  /** Saniye gizliyken dakika yukarı yuvarlanır ki "00:00" yalnızca vakit
   *  gerçekten girdiğinde görünsün. */
  formatRemaining(seconds: number, showSeconds: boolean): string {
    seconds = Math.max(0, Math.floor(seconds));
    if (!showSeconds) {
      let totalMinutes = Math.ceil(seconds / 60);
      let hour = Math.floor(totalMinutes / 60);
      let minutes = totalMinutes % 60;
      return this.padZero(hour) + ':' + this.padZero(minutes);
    }
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
