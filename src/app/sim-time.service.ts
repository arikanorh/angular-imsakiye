import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import moment from 'moment';

@Injectable({ providedIn: 'root' })
export class SimTimeService {
  private overrideSubject = new BehaviorSubject<moment.Moment | null>(null);
  override$ = this.overrideSubject.asObservable();

  get override(): moment.Moment | null {
    return this.overrideSubject.value;
  }

  get isActive(): boolean {
    return this.overrideSubject.value !== null;
  }

  now(): moment.Moment {
    const override = this.overrideSubject.value;
    return override ? override.clone() : moment();
  }

  set(value: moment.Moment) {
    this.overrideSubject.next(value.clone());
  }

  reset() {
    this.overrideSubject.next(null);
  }
}
