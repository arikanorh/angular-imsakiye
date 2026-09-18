import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { imsakiye } from './imsakiye';

@Injectable({ providedIn: 'root' })
export class CityService {
  cities = Object.keys(imsakiye);

  private citySubject: BehaviorSubject<string>;
  city$;

  constructor(private cookieService: CookieService) {
    let initial = this.cookieService.get('city');
    if (!this.cities.includes(initial)) {
      initial = this.cities[0];
      this.cookieService.set('city', initial);
    }
    this.citySubject = new BehaviorSubject<string>(initial);
    this.city$ = this.citySubject.asObservable();
  }

  get city(): string {
    return this.citySubject.value;
  }

  setCity(city: string) {
    this.cookieService.set('city', city);
    this.citySubject.next(city);
  }
}
