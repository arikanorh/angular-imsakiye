import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HelloComponent } from './hello.component';
import { TodayComponent } from './today/today.component';
import { TakvimComponent } from './takvim/takvim.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { CookieService } from 'ngx-cookie-service';
import { RouterModule } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  imports: [BrowserModule, FormsModule, RouterModule.forRoot([
      { path: '', component: TodayComponent },
      { path: 'takvim', component: TakvimComponent },
    ]),
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerImmediately'
      })
    ],
  declarations: [AppComponent, HelloComponent, TodayComponent, TakvimComponent, AdminPanelComponent],
  bootstrap: [AppComponent],
  providers: [CookieService],
})
export class AppModule {}
