import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HelloComponent } from './hello.component';
import { CookieService } from 'ngx-cookie-service';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [BrowserModule, FormsModule, RouterModule.forRoot([])],
  declarations: [AppComponent, HelloComponent],
  bootstrap: [AppComponent],
  providers: [CookieService],
})
export class AppModule {}
