import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { RequestRow } from '../core/models';
import { AgoPipe, FcfaPipe } from './format';
import { BadgePipe } from './labels';

/** Tableau des demandes (liste complète, fiche client, tableau de bord) ; une ligne ouvre la demande. */
@Component({
  selector: 'app-request-table',
  imports: [AgoPipe, FcfaPipe, BadgePipe],
  template: `
    @if (rows().length) {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Réf.</th>
              <th>Demande</th>
              @if (!hideClient()) {
                <th>Client</th>
              }
              <th>Prestataire</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Créée</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              @let status = r.status | badge: 'request';
              <tr class="clickable" tabindex="0" (click)="open(r)" (keydown.enter)="open(r)">
                <td class="cell-sub">{{ r.ref }}</td>
                <td>
                  <div class="cell-main">{{ r.title }}</div>
                  <div class="cell-sub">{{ r.trade }} · {{ r.district }}@if (r.urgent) { · urgent }</div>
                </td>
                @if (!hideClient()) {
                  <td>{{ r.clientName || '—' }}</td>
                }
                <td>{{ r.businessName || '—' }}</td>
                <td>{{ r.amountFcfa | fcfa }}</td>
                <td>
                  <span class="pill {{ status.tone }}">
                    {{ r.status === 'OFFERS_RECEIVED' ? r.proposalCount + ' proposition' + (r.proposalCount > 1 ? 's' : '') : status.label }}
                  </span>
                </td>
                <td class="cell-sub">{{ r.createdAt | ago }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="card empty">{{ emptyText() }}</div>
    }
  `,
})
export class RequestTable {
  private readonly router = inject(Router);

  readonly rows = input.required<RequestRow[]>();
  readonly hideClient = input(false);
  readonly emptyText = input('Aucune demande.');

  protected open(r: RequestRow): void {
    this.router.navigate(['/requests', r.id]);
  }
}
