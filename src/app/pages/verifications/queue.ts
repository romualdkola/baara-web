import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/auth';
import { QueueItem, VerificationStatus } from '../../core/models';
import { AgoPipe, InitialsPipe } from '../../shared/format';

/** File de vérification : dossiers en attente (les plus anciens d'abord), refusés, validés. */
@Component({
  selector: 'app-verification-queue',
  imports: [FormsModule, AgoPipe, InitialsPipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Vérifications</h1>
          <p class="muted">Les dossiers les plus anciens en premier. Objectif : réponse sous 48 h.</p>
        </div>
      </div>
      <div class="row">
        <div class="tabs" role="group" aria-label="Statut des dossiers">
          @for (t of tabs; track t.value) {
            <button type="button" class="tab" [class.on]="status() === t.value" [attr.aria-pressed]="status() === t.value"
              (click)="status.set(t.value)">{{ t.label }}</button>
          }
        </div>
        <span class="spacer"></span>
        <input class="search" type="search" placeholder="Nom, téléphone, métier" aria-label="Rechercher un dossier"
          [ngModel]="q()" (ngModelChange)="q.set($event)" />
      </div>

      @if (error()) {
        <div class="notice terra">{{ error() }}</div>
      }

      @if (rows().length) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Prestataire</th>
                <th>Métiers</th>
                <th>Zone</th>
                <th>Pièces</th>
                <th>{{ status() === 'PENDING' ? 'En attente depuis' : 'Décision' }}</th>
                <th><span class="visually-hidden">Action</span></th>
              </tr>
            </thead>
            <tbody>
              @for (p of rows(); track p.id) {
                <tr class="clickable" (click)="open(p)">
                  <td>
                    <div class="row" style="flex-wrap: nowrap">
                      <span class="avatar">{{ p.fullName || p.businessName | initials }}</span>
                      <span>
                        <div class="cell-main">{{ p.fullName || p.businessName }}</div>
                        <div class="cell-sub">{{ p.phone }}</div>
                      </span>
                    </div>
                  </td>
                  <td>{{ p.trades || '—' }}</td>
                  <td>{{ p.radiusKm }} km</td>
                  <td><span class="pill green-soft">{{ p.documentCount }} pièce{{ p.documentCount > 1 ? 's' : '' }}</span></td>
                  <td>
                    @if (status() === 'PENDING') {
                      <span [style.color]="old(p) ? 'var(--terra-dark)' : null" style="font-weight: 600">{{ p.submittedAt | ago }}</span>
                    } @else {
                      <div>{{ p.reviewedAt | ago }}</div>
                      @if (p.reason) {
                        <div class="cell-sub">{{ p.reason }}</div>
                      }
                    }
                  </td>
                  <td style="text-align: right">
                    <button type="button" class="btn small green" (click)="open(p); $event.stopPropagation()">
                      {{ status() === 'PENDING' ? 'Examiner' : 'Voir' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!loading()) {
        <div class="card empty">
          {{ status() === 'PENDING' ? 'Aucun dossier en attente. Tout est à jour.' : 'Aucun dossier.' }}
        </div>
      }
    </div>
  `,
})
export class VerificationQueuePage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);

  protected readonly tabs: { value: VerificationStatus; label: string }[] = [
    { value: 'PENDING', label: 'En attente' },
    { value: 'REJECTED', label: 'Refusés' },
    { value: 'APPROVED', label: 'Validés' },
  ];
  protected readonly status = signal<VerificationStatus>('PENDING');
  protected readonly q = signal('');
  protected readonly rows = signal<QueueItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const status = this.status();
      const q = this.q();
      // Petite attente pendant la frappe, pour ne pas interroger l'API à chaque lettre
      const timer = setTimeout(() => this.load(status, q), q ? 250 : 0);
      onCleanup(() => clearTimeout(timer));
    });
  }

  /** Plus de 48 h d'attente : l'objectif de délai est dépassé. */
  protected old(p: QueueItem): boolean {
    return !!p.submittedAt && Date.now() - new Date(p.submittedAt).getTime() > 48 * 3600 * 1000;
  }

  protected open(p: QueueItem): void {
    this.router.navigate(['/verifications', p.id]);
  }

  private async load(status: VerificationStatus, q: string): Promise<void> {
    this.loading.set(true);
    try {
      this.rows.set(await this.api.verifications(status, q));
      this.error.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
