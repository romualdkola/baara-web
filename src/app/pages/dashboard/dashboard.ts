import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminApi } from '../../core/admin-api';
import { AuthService, errorMessage } from '../../core/auth';
import { Dashboard, Period } from '../../core/models';
import { AgoPipe, FcfaPipe, RatingPipe } from '../../shared/format';

/** Tableau de bord : chiffres de la période, choses à traiter, dernières demandes. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, FcfaPipe, AgoPipe, RatingPipe],
  styleUrl: './dashboard.scss',
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="muted">{{ today }} · Abidjan</div>
          <h1>Bonjour {{ firstName() }}</h1>
        </div>
        <div class="tabs" role="group" aria-label="Période">
          @for (p of periods; track p.value) {
            <button type="button" class="tab" [class.on]="period() === p.value" [attr.aria-pressed]="period() === p.value"
              (click)="period.set(p.value)">{{ p.label }}</button>
          }
        </div>
      </div>

      @if (error()) {
        <div class="notice terra">{{ error() }}</div>
      }

      @if (data(); as d) {
        <div class="grid-kpi">
          <div class="kpi terra">
            <span>Demandes publiées</span>
            <strong>{{ d.kpis.requestsPublished }}</strong>
            <span class="small">dont {{ d.kpis.requestsWithoutOffer }} sans proposition</span>
          </div>
          <div class="kpi green">
            <span>Missions terminées</span>
            <strong>{{ d.kpis.missionsCompleted }}</strong>
            <span class="small">note moyenne {{ d.kpis.averageRating | rating }}</span>
          </div>
          <div class="kpi">
            <span>Volume payé</span>
            <strong>{{ d.kpis.volumePaidFcfa | fcfa }}</strong>
            <span class="small muted">espèces, déclaré par les clients</span>
          </div>
          <div class="kpi">
            <span>Nouveaux inscrits</span>
            <strong>{{ d.kpis.newAccounts }}</strong>
            <span class="small muted">dont {{ d.kpis.newProviders }} prestataires</span>
          </div>
        </div>

        <div class="grid">
          <section class="card">
            <h2>À traiter</h2>
            <a class="todo" routerLink="/verifications">
              <span class="n yellow">{{ d.todo.pendingVerifications }}</span>
              <span class="grow">
                <strong>Prestataires à vérifier</strong>
                <span class="small muted">
                  @if (d.todo.oldestPendingSince) {
                    Le plus ancien attend depuis {{ d.todo.oldestPendingSince | ago }}
                  } @else {
                    Aucun dossier en attente
                  }
                </span>
              </span>
            </a>
            <a class="todo" routerLink="/requests" [queryParams]="{ stage: 'OPEN' }">
              <span class="n green">{{ d.todo.staleRequests }}</span>
              <span class="grow">
                <strong>Demandes sans proposition depuis 24 h</strong>
                <span class="small muted">À relancer auprès des prestataires</span>
              </span>
            </a>
          </section>
          <section class="card">
            <div class="row">
              <h2>Dernières demandes</h2>
              <span class="spacer"></span>
              <a routerLink="/requests">Tout voir</a>
            </div>
            @for (r of d.recentRequests; track r.id) {
              <a class="list-line recent" [routerLink]="['/requests', r.id]">
                <span class="grow">
                  <strong>{{ r.title }}</strong>
                  <span class="small muted">{{ r.trade }} · {{ r.district }} · {{ r.clientName || '—' }}</span>
                </span>
                <span class="small muted">{{ r.createdAt | ago }}</span>
              </a>
            } @empty {
              <p class="muted">Aucune demande pour l’instant.</p>
            }
          </section>
        </div>
      } @else if (!error()) {
        <div class="card empty">Chargement…</div>
      }
    </div>
  `,
})
export class DashboardPage {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);

  protected readonly periods: { value: Period; label: string }[] = [
    { value: 'TODAY', label: 'Aujourd’hui' },
    { value: 'WEEK', label: '7 jours' },
    { value: 'MONTH', label: '30 jours' },
  ];
  protected readonly today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date())
    .replace(/^./, (c) => c.toUpperCase());
  protected readonly period = signal<Period>('TODAY');
  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal<string | null>(null);

  protected firstName(): string {
    return (this.auth.staff()?.fullName ?? '').split(' ')[0];
  }

  constructor() {
    effect(() => {
      const period = this.period();
      this.api
        .dashboard(period)
        .then((d) => {
          this.data.set(d);
          this.error.set(null);
        })
        .catch((e) => this.error.set(errorMessage(e)));
    });
  }
}
