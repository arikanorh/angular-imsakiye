import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { imsakiye } from './imsakiye';
import moment from 'moment';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  @ViewChild('city') cityElement: ElementRef;
  datas = imsakiye;
  cities = Object.keys(this.datas);

  day = '';
  date = '';
  start = '';
  end = '';
  remaining;
  sahurPassed;
  iftarPassed;

  city: string;

  constructor(private cookieService: CookieService) {}

  selectCity(e) {
    this.cookieService.set('city', this.city);
  }

  ngOnInit() {
    this.city = this.cookieService.get('city');
    if (!this.cities.includes(this.city)) {
      this.city = this.cities[0];
      this.cookieService.set('city', this.city);
    }

    let self = this;

    setInterval(function () {
      self.calc();
    }, 1000);

    this.calc();
  }

  calc() {
    // this.cityElement.nativeElement.value = this.city;

    let data = this.datas[this.city];
    let format = 'YYYY-MM-DD HH:mm:ss';
    // let todayDateTime = moment("2020-04-25 20:00:30", format);
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

    let sahurDateTimeStr = today.date + ' ' + today.start;
    let iftarDateTimeStr = today.date + ' ' + today.end;
    let sahurDateTime = moment(sahurDateTimeStr, format);
    let iftarDateTime = moment(iftarDateTimeStr, format);

    let sahurPassed: boolean = todayDateTime.isAfter(sahurDateTime);
    let iftarPassed: boolean = todayDateTime.isAfter(iftarDateTime);

    let nextDay: boolean = false;

    if (iftarPassed) {
      today = next;
      nextDay = true;
    }

    sahurDateTimeStr = today.date + ' ' + today.start;
    iftarDateTimeStr = today.date + ' ' + today.end;
    sahurDateTime = moment(sahurDateTimeStr, format);
    iftarDateTime = moment(iftarDateTimeStr, format);

    this.date = todayDateTime.format(format);
    this.day = today.day;
    this.start = today.start;
    this.end = today.end;

    sahurPassed = todayDateTime.isAfter(sahurDateTime);
    iftarPassed = todayDateTime.isAfter(iftarDateTime);

    if (nextDay) {
      this.sahurPassed = true;
      this.iftarPassed = true;
    } else {
      this.sahurPassed = todayDateTime.isAfter(sahurDateTime);
      this.iftarPassed = iftarPassed;
    }

    let subjectDateTime = sahurDateTime;
    if (sahurPassed) {
      subjectDateTime = iftarDateTime;
    }
    this.remaining = this.convertToXXHoursYYMinutes(
      moment.duration(subjectDateTime.diff(todayDateTime)).as('seconds')
    );
  }

  convertToXXHoursYYMinutes(seconds) {
    seconds = Math.floor(seconds);
    let hour = Math.floor(seconds / (60 * 60));
    let minutes = Math.floor((seconds % (60 * 60)) / 60);
    let secs = seconds % 60;

    return (
      this.padZero(hour) +
      ':' +
      this.padZero(minutes) +
      ':' +
      this.padZero(secs)
    );
  }

  padZero(number) {
    if (number < 10) return '0' + number;
    else return number;
  }
}
