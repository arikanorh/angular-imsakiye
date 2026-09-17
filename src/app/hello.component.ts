import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'hello',
    template: `<h1>Hello {{name}}!</h1>`,
    styles: [`h1 { font-family: Lato; }`],
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class HelloComponent  {
  @Input() name: string;
}
