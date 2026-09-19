import { Component, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
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
/** Simülasyon açıldığında başlangıç konumu: Ramazan'a 2 gün kala. */
const DEFAULT_OFFSET = -2;

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  standalone: false,
})
export class AdminPanelComponent implements OnInit, OnChanges, OnDestroy {
  isOpen = false;

  /** Mobil yüzen barın görünürlüğü; üst karttaki geçici düğme kontrol eder. */
  @Input() mobileOpen = false;

  timeOfDay = '10:00';
  dayOffset = DEFAULT_OFFSET;

  minOffset = -DAYS_BEFORE;
  maxOffset: number;

  private ramadanStart: moment.Moment;
  private totalDays: number;

  private refreshTimer;

  // − / + düğmeleri basılı tutulduğunda otomatik tekrar için zamanlayıcılar.
  private holdDelayTimer;
  private holdRepeatTimer;

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
    this.stopHold();
  }

  /** − / + düğmesine basıldığında hemen bir adım atar; basılı tutulursa
   *  kısa bir gecikmeden sonra bırakılana dek tekrar eder. Tekrar uzadıkça
   *  hızlanır: gün için aralık kısalır, saat için adım 5 → 15 → 60 dakikaya
   *  büyür ki bir günü basılı tutarak birkaç saniyede geçmek mümkün olsun. */
  startHold(kind: 'day' | 'time', delta: number, event: Event) {
    event.preventDefault();
    this.stopHold();

    // Parmak/işaretçi düğmeden hafifçe kaysa bile pointerup bize gelsin.
    const target = event.target as HTMLElement | null;
    const pointerId = (event as PointerEvent).pointerId;
    if (target && typeof target.setPointerCapture === 'function' && pointerId !== undefined) {
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // Bazı tarayıcılar yakalamayı reddedebilir; tekrar yine de çalışır.
      }
    }

    let repeats = 0;
    const direction = delta < 0 ? -1 : 1;
    const step = () => {
      repeats++;
      if (kind === 'day') {
        this.stepDay(direction);
      } else {
        const magnitude = repeats > 30 ? 60 : repeats > 10 ? 15 : 5;
        this.stepMinutes(direction * magnitude);
      }
    };

    step();
    this.holdDelayTimer = setTimeout(() => {
      const tick = () => {
        step();
        const interval = repeats > 20 ? 50 : 90;
        this.holdRepeatTimer = setTimeout(tick, interval);
      };
      tick();
    }, 400);
  }

  /** Parmak/işaretçi düğme dışında bırakılsa veya sekme arka plana
   *  düşse bile tekrar durur. */
  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  @HostListener('window:blur')
  onGlobalRelease() {
    this.stopHold();
  }

  stopHold() {
    if (this.holdDelayTimer) {
      clearTimeout(this.holdDelayTimer);
      this.holdDelayTimer = null;
    }
    if (this.holdRepeatTimer) {
      clearTimeout(this.holdRepeatTimer);
      this.holdRepeatTimer = null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Mobil bar üst karttaki düğmeyle açıldığında simülasyonu başlat.
    if (changes['mobileOpen'] && this.mobileOpen) {
      this.activateIfIdle();
    }
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.activateIfIdle();
    }
  }

  /** Panel/bar açılırken simülasyon çalışmıyorsa varsayılan konumdan
   *  (Ramazan'a 2 gün kala, 10:00) başlat. */
  private activateIfIdle() {
    if (!this.simTime.isActive) {
      this.dayOffset = DEFAULT_OFFSET;
      this.timeOfDay = '10:00';
      this.simTime.set(this.selectedMoment);
    }
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

  /** Saat kaydırıcısı için gün içindeki dakika (0-1439). */
  get timeMinutes(): number {
    const [h, m] = this.timeOfDay.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  get timeLabel(): string {
    return this.timeOfDay;
  }

  /** Mobil saat kaydırıcısı: gün ayrı kaydırıcıda olduğundan gece yarısı
   *  sarması uygulanmaz, yalnızca saat/dakika değişir. */
  onMinutesChange(value: string) {
    const total = Math.max(0, Math.min(24 * 60 - 1, Number(value) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    this.timeOfDay = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.simTime.set(this.selectedMoment);
  }

  /** Mobil − / + düğmeleri: gün kaydırıcısını sınırlar içinde bir adım oynatır. */
  stepDay(delta: number) {
    const next = Math.max(this.minOffset, Math.min(this.maxOffset, this.dayOffset + delta));
    this.onOffsetChange(String(next));
  }

  /** Mobil − / + düğmeleri: saati dakika cinsinden oynatır. Gün sınırı
   *  aşılırsa (23:55'ten ileri veya 00:00'dan geri) gün kaydırıcısı da
   *  bir gün ileri/geri gider; gün sınırlarının dışına çıkılamıyorsa
   *  saat uçta kalır. */
  stepMinutes(delta: number) {
    const DAY_MINUTES = 24 * 60;
    const MAX_SLIDER_MINUTES = DAY_MINUTES - 5; // kaydırıcının üst sınırı (23:55)
    let total = this.timeMinutes + delta;

    if (total > MAX_SLIDER_MINUTES) {
      if (this.dayOffset < this.maxOffset) {
        this.dayOffset += 1;
        total -= DAY_MINUTES;
      } else {
        total = MAX_SLIDER_MINUTES;
      }
    } else if (total < 0) {
      if (this.dayOffset > this.minOffset) {
        this.dayOffset -= 1;
        total += DAY_MINUTES;
      } else {
        total = 0;
      }
    }

    this.onMinutesChange(String(Math.max(0, Math.min(MAX_SLIDER_MINUTES, total))));
  }

  onOffsetChange(value: string) {
    this.dayOffset = Number(value);
    this.simTime.set(this.selectedMoment);
  }

  onTimeChange(value: string) {
    if (!value) {
      return;
    }
    // Saat okla artırılıp 23:59->00:00'a sarıyorsa bir sonraki güne,
    // azaltılıp 00:00->23:59'a sarıyorsa bir önceki güne geçilmiş demektir.
    // Hangisi olduğunu ayırt etmek için gece yarısını "saran" mesafe ile
    // aynı gün içindeki düz mesafeyi karşılaştırıp kısa olanı seçiyoruz;
    // böylece aynı gün içindeki küçük ileri/geri oynatmalar gün
    // kaydırıcısını yanlışlıkla değiştirmiyor.
    const DAY_MINUTES = 24 * 60;
    const [newH, newM] = value.split(':').map(Number);
    const [oldH, oldM] = this.timeOfDay.split(':').map(Number);
    const oldTotal = oldH * 60 + oldM;
    const newTotal = newH * 60 + newM;

    if (newTotal < oldTotal) {
      const forwardWrapDist = DAY_MINUTES - oldTotal + newTotal;
      const sameDayDist = oldTotal - newTotal;
      if (forwardWrapDist < sameDayDist) {
        this.dayOffset = Math.min(this.maxOffset, this.dayOffset + 1);
      }
    } else if (newTotal > oldTotal) {
      const backwardWrapDist = oldTotal + (DAY_MINUTES - newTotal);
      const sameDayDist = newTotal - oldTotal;
      if (backwardWrapDist < sameDayDist) {
        this.dayOffset = Math.max(this.minOffset, this.dayOffset - 1);
      }
    }

    this.timeOfDay = value;
    this.simTime.set(this.selectedMoment);
  }

  resetToReal() {
    this.dayOffset = DEFAULT_OFFSET;
    this.timeOfDay = '10:00';
    this.simTime.reset();
  }
}
