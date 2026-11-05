import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Fenêtre de confirmation d'une action qui demande un motif ou une note (refus, suspension, réactivation).
 * Les motifs proposés remplissent le champ, qui reste modifiable.
 */
@Component({
  selector: 'app-reason-dialog',
  imports: [FormsModule],
  template: `
    <div class="dialog-backdrop" (click)="cancelled.emit()">
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
        <h2>{{ title() }}</h2>
        @if (message()) {
          <p class="muted" style="margin: 0">{{ message() }}</p>
        }
        @if (presets().length) {
          <div class="row">
            @for (preset of presets(); track preset) {
              <button type="button" class="btn small outline" [class.green]="text() === preset" (click)="text.set(preset)">
                {{ preset }}
              </button>
            }
          </div>
        }
        <label class="field">
          {{ fieldLabel() }}
          <textarea [ngModel]="text()" (ngModelChange)="text.set($event)" maxlength="1000"></textarea>
        </label>
        <div class="row" style="justify-content: flex-end">
          <button type="button" class="btn outline" (click)="cancelled.emit()">Annuler</button>
          <button
            type="button"
            class="btn"
            [class.terra]="tone() === 'terra'"
            [class.green]="tone() === 'green'"
            [disabled]="busy() || (required() && !text().trim())"
            (click)="confirmed.emit(text().trim())"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ReasonDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly fieldLabel = input('Motif');
  readonly confirmLabel = input('Confirmer');
  readonly tone = input<'terra' | 'green'>('terra');
  readonly presets = input<string[]>([]);
  readonly required = input(true);
  readonly busy = input(false);

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  protected readonly text = signal('');
}
