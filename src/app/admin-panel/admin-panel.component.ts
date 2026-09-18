import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import moment from 'moment';
import { imsakiye } from '../imsakiye';
import { CityService } from '../city.service';
import { SimTimeService } from '../sim-time.service';

interface SimScenario {
  label: string;
  date: moment.Moment;
}

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
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  standalone: false,
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  @ViewChild('track') trackRef: ElementRef<HTMLDivElement>;

  isOpen = false;
  private dragging = false;

  selectedMoment: moment.Moment;
  timeOfDay = '10:00';

  rangeStart: moment.Moment;
  rangeEnd: moment.Moment;
  scenarios: SimScenario[] = [];

  private refreshTimer;

  constructor(
    private cityService: CityService,
    public simTime: SimTimeService
  ) {
    const data = imsakiye[this.cityService.city];
    const first = moment(data[0].date, 'YYYY-MM-DD');
    const last = moment(data[data.length - 1].date, 'YYYY-MM-DD');

    this.rangeStart = first.clone().subtract(45, 'days');
    this.rangeEnd = last.clone().add(10, 'days');

    this.scenarios = [
      { label: '40 gün kala', date: first.clone().subtract(40, 'days').hour(10).minute(0) },
      { label: '15 gün kala', date: first.clone().subtract(15, 'days').hour(10).minute(0) },
      { label: '1 gün kala', date: first.clone().subtract(1, 'days').hour(10).minute(0) },
      { label: 'Ramazan 1. gün', date: first.clone().hour(10).minute(0) },
      { label: 'Ramazan 3. gün', date: first.clone().add(2, 'days').hour(10).minute(0) },
      { label: 'Ramazan 15. gün', date: first.clone().add(14, 'days').hour(10).minute(0) },
      { label: 'Bitişten sonra', date: last.clone().add(5, 'days').hour(10).minute(0) },
    ];

    this.selectedMoment = this.rangeStart.clone().hour(10).minute(0);
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

  get sliderFraction(): number {
    const total = this.rangeEnd.diff(this.rangeStart);
    const elapsed = this.selectedMoment.diff(this.rangeStart);
    return Math.min(1, Math.max(0, elapsed / total));
  }

  get readoutDate(): string {
    const m = this.selectedMoment;
    return `${m.date()} ${AY_ADLARI_TR[m.month()]} ${m.year()}`;
  }

  isActiveScenario(s: SimScenario): boolean {
    return this.selectedMoment.format('YYYY-MM-DD') === s.date.format('YYYY-MM-DD');
  }

  applyScenario(s: SimScenario) {
    this.selectedMoment = s.date.clone();
    this.timeOfDay = this.selectedMoment.format('HH:mm');
    this.simTime.set(this.selectedMoment);
  }

  onTimeChange(value: string) {
    if (!value) {
      return;
    }
    const [h, m] = value.split(':').map(Number);
    this.selectedMoment = this.selectedMoment.clone().hour(h).minute(m).second(0);
    this.simTime.set(this.selectedMoment);
  }

  resetToReal() {
    this.selectedMoment = moment();
    this.timeOfDay = this.selectedMoment.format('HH:mm');
    this.simTime.reset();
  }

  onTrackPointerDown(event: PointerEvent) {
    this.dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateFromPointer(event);
  }

  onTrackPointerMove(event: PointerEvent) {
    if (!this.dragging) {
      return;
    }
    this.updateFromPointer(event);
  }

  onTrackPointerUp() {
    this.dragging = false;
  }

  private updateFromPointer(event: PointerEvent) {
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const relY = event.clientY - rect.top;
    const fractionFromTop = Math.min(1, Math.max(0, relY / rect.height));
    const fraction = 1 - fractionFromTop;
    const totalMs = this.rangeEnd.diff(this.rangeStart);

    const [h, m] = this.timeOfDay.split(':').map(Number);
    this.selectedMoment = this.rangeStart
      .clone()
      .add(totalMs * fraction, 'milliseconds')
      .hour(h || 0)
      .minute(m || 0)
      .second(0);
    this.simTime.set(this.selectedMoment);
  }
}
