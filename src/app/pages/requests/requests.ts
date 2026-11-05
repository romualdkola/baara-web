import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/auth';
import { RequestRow, Stage } from '../../core/models';
import { RequestTable } from '../../shared/request-table';

/** Demandes et missions de toute la plateforme, par étape, avec recherche par référence, client ou prestataire. */
@Component({
  selector: 'app-requests',
  imports: [FormsModule, RequestTable],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Demandes et missions</h1>
        <input class="search" type="search" placeholder="Référence (BA-0412), titre, client, prestataire"
          aria-label="Rechercher une demande" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      </div>
      <div class="tabs" role="group" aria-label="Étape">
        @for (s of stages; track s.label) {
          <button type="button" class="tab" [class.on]="current() === s.value" [attr.aria-pressed]="current() === s.value"
            (click)="current.set(s.value)">{{ s.label }}</button>
        }
      </div>
      @if (error()) {
        <div class="notice terra" role="alert">{{ error() }}</div>
      }
      <app-request-table [rows]="rows()" [emptyText]="loading() ? 'Chargement…' : 'Aucune demande ne correspond.'" />
    </div>
  `,
})
export class RequestsPage {
  private readonly api = inject(AdminApi);

  /** Étape demandée par un lien (?stage=OPEN), par exemple depuis le tableau de bord. */
  readonly stage = input<string | undefined>();

  protected readonly stages: { value: Stage | null; label: string }[] = [
    { value: null, label: 'Toutes' },
    { value: 'OPEN', label: 'Ouvertes' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'DONE', label: 'Terminées' },
    { value: 'CANCELLED', label: 'Annulées' },
    { value: 'DISPUTED', label: 'Litiges' },
  ];
  protected readonly current = signal<Stage | null>(null);
  protected readonly q = signal('');
  protected readonly rows = signal<RequestRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const fromLink = this.stages.find((s) => s.value === this.stage())?.value;
      if (fromLink) this.current.set(fromLink);
    });
    effect((onCleanup) => {
      const filter = { stage: this.current(), q: this.q() };
      const timer = setTimeout(() => this.load(filter), filter.q ? 250 : 0);
      onCleanup(() => clearTimeout(timer));
    });
  }

  private async load(filter: { stage: Stage | null; q: string }): Promise<void> {
    this.loading.set(true);
    try {
      this.rows.set(await this.api.requests(filter));
      this.error.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
