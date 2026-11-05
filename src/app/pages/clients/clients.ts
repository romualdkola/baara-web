import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/auth';
import { AccountStatus, ClientDetail, ClientRow } from '../../core/models';
import { AccountActions } from '../../shared/account-actions';
import { DayPipe, FcfaPipe, InitialsPipe } from '../../shared/format';
import { HistoryList } from '../../shared/history-list';
import { BadgePipe } from '../../shared/labels';
import { RequestTable } from '../../shared/request-table';

/** Clients : liste à gauche, fiche du client choisi à droite (chiffres, demandes, historique, actions). */
@Component({
  selector: 'app-clients',
  imports: [FormsModule, RouterLink, AccountActions, HistoryList, RequestTable, BadgePipe, DayPipe, FcfaPipe, InitialsPipe],
  styleUrl: './clients.scss',
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Clients</h1>
        <div class="row">
          <div class="tabs" role="group" aria-label="Statut">
            @for (t of tabs; track t.label) {
              <button type="button" class="tab" [class.on]="status() === t.value" [attr.aria-pressed]="status() === t.value"
                (click)="status.set(t.value)">{{ t.label }}</button>
            }
          </div>
          <input class="search" type="search" placeholder="Nom ou téléphone" aria-label="Rechercher un client"
            [ngModel]="q()" (ngModelChange)="q.set($event)" />
        </div>
      </div>

      @if (error()) {
        <div class="notice terra" role="alert">{{ error() }}</div>
      }

      <div class="split">
        <div class="card list" role="list">
          @for (c of rows(); track c.id) {
            @let s = c.status | badge: 'account';
            <button type="button" role="listitem" class="client" [class.on]="selectedId() === c.id"
              [attr.aria-current]="selectedId() === c.id" (click)="select(c.id)">
              <span class="avatar">{{ c.fullName | initials }}</span>
              <span class="grow">
                <strong>{{ c.fullName || 'Sans nom' }}</strong>
                <span class="small muted">{{ c.phone }} · {{ c.requestCount }} demande{{ c.requestCount > 1 ? 's' : '' }}</span>
              </span>
              <span class="pill {{ s.tone }}">{{ s.label }}</span>
            </button>
          } @empty {
            <p class="muted empty">{{ loading() ? 'Chargement…' : 'Aucun client ne correspond.' }}</p>
          }
        </div>

        <div class="detail">
          @if (detail(); as d) {
            <section class="card">
              <div class="row">
                <span class="avatar big">{{ d.fullName | initials }}</span>
                <div class="grow">
                  <h2>{{ d.fullName || 'Sans nom' }}</h2>
                  <div class="muted">{{ d.phone }} · inscrit le {{ d.createdAt | day }}</div>
                </div>
              </div>
              @if (d.provider && d.businessId) {
                <div class="notice green">Aussi prestataire : <a [routerLink]="['/providers', d.businessId]">voir sa fiche</a></div>
              }
              @if (d.status === 'SUSPENDED') {
                <div class="notice terra">Compte suspendu : ce client ne peut plus utiliser l’app.</div>
              }
              <div class="grid-kpi">
                <div class="kpi stat"><strong>{{ d.stats.requests }}</strong><span class="small muted">demandes</span></div>
                <div class="kpi stat"><strong>{{ d.stats.done }}</strong><span class="small muted">terminées</span></div>
                <div class="kpi stat"><strong>{{ d.stats.cancelled }}</strong><span class="small muted">annulées</span></div>
                <div class="kpi stat"><strong>{{ d.stats.volumePaidFcfa | fcfa }}</strong><span class="small muted">payés</span></div>
              </div>
              <app-account-actions [accountId]="d.id" [status]="d.status" [subject]="d.fullName || 'Ce client'"
                (changed)="refresh()" />
            </section>
            <h3>Demandes</h3>
            <app-request-table [rows]="d.requests" [hideClient]="true" emptyText="Aucune demande pour l’instant." />
            <section class="card">
              <h3>Historique</h3>
              <app-history-list [entries]="d.history" />
            </section>
          } @else if (rows().length) {
            <div class="card empty">Choisissez un client dans la liste.</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ClientsPage {
  private readonly api = inject(AdminApi);

  protected readonly tabs: { value: AccountStatus | null; label: string }[] = [
    { value: null, label: 'Tous' },
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'SUSPENDED', label: 'Suspendus' },
  ];
  protected readonly status = signal<AccountStatus | null>(null);
  protected readonly q = signal('');
  protected readonly rows = signal<ClientRow[]>([]);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly detail = signal<ClientDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const filter = { status: this.status(), q: this.q() };
      const timer = setTimeout(() => this.load(filter), filter.q ? 250 : 0);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected async select(id: number): Promise<void> {
    this.selectedId.set(id);
    try {
      this.detail.set(await this.api.client(id));
      this.error.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  /** Après une action : la fiche et son statut dans la liste. */
  protected async refresh(): Promise<void> {
    const id = this.selectedId();
    if (id === null) return;
    await this.select(id);
    const d = this.detail();
    if (d) this.rows.update((rows) => rows.map((r) => (r.id === d.id ? { ...r, status: d.status } : r)));
  }

  private async load(filter: { status: AccountStatus | null; q: string }): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.api.clients(filter);
      this.rows.set(rows);
      this.error.set(null);
      // Premier client choisi d'office, pour ne pas laisser la fiche vide
      if (rows.length && !rows.some((r) => r.id === this.selectedId())) await this.select(rows[0].id);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
