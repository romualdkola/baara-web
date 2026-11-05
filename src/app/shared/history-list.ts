import { Component, input } from '@angular/core';

import { AuditEntry } from '../core/models';
import { DayTimePipe } from './format';
import { ActionPipe } from './labels';

/** Historique des actions de l'équipe sur un compte ou un dossier (journal d'audit). */
@Component({
  selector: 'app-history-list',
  imports: [ActionPipe, DayTimePipe],
  template: `
    @for (h of entries(); track h.id) {
      <div class="list-line">
        <span class="grow">
          <strong>{{ h.action | action }}</strong>
          <span class="small muted">
            {{ h.staffName ? 'par ' + h.staffName : 'automatique' }}@if (h.note) { · {{ h.note }} }
          </span>
        </span>
        <span class="small muted">{{ h.createdAt | dayTime }}</span>
      </div>
    } @empty {
      <p class="muted" style="margin: 0">Aucune action de l’équipe pour l’instant.</p>
    }
  `,
})
export class HistoryList {
  readonly entries = input.required<AuditEntry[]>();
}
