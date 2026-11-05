import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/auth';
import { ProviderDetail } from '../../core/models';
import { AccountActions } from '../../shared/account-actions';
import { DayPipe, DayTimePipe, FcfaPipe, InitialsPipe, RatingPipe } from '../../shared/format';
import { HistoryList } from '../../shared/history-list';
import { BadgePipe } from '../../shared/labels';

/** Fiche prestataire : chiffres, équipe, missions, avis, historique ; suspension et notes internes. */
@Component({
  selector: 'app-provider',
  imports: [RouterLink, AccountActions, HistoryList, BadgePipe, DayPipe, DayTimePipe, FcfaPipe, InitialsPipe, RatingPipe],
  template: `
    <div class="page">
      <a routerLink="/providers">← Prestataires</a>
      @if (error()) {
        <div class="notice terra" role="alert">{{ error() }}</div>
      }
      @if (detail(); as d) {
        @let status = d.status | badge: 'provider';
        <div class="page-head">
          <div class="row">
            <span class="avatar big">{{ d.businessName | initials }}</span>
            <div>
              <div class="row">
                <h1>{{ d.businessName }}</h1>
                <span class="pill {{ status.tone }}">{{ status.label }}</span>
                @if (!d.available) {
                  <span class="pill">Indisponible</span>
                }
              </div>
              <div class="muted">
                {{ tradeLabels() }} · {{ d.radiusKm }} km
                @if (d.manager) { · {{ d.manager.fullName }} · {{ d.manager.phone }} }
                · membre depuis {{ d.createdAt | day }}
              </div>
            </div>
          </div>
          @if (d.manager) {
            <app-account-actions [accountId]="d.manager.accountId" [status]="d.manager.accountStatus"
              [subject]="d.manager.fullName || 'Le prestataire'" (changed)="reload()" />
          }
        </div>

        @if (d.status === 'SUSPENDED') {
          <div class="notice terra">
            Compte suspendu : le prestataire n’apparaît plus dans les recherches et ne voit plus la corbeille.
            Ses missions en cours restent visibles par les clients.
          </div>
        }

        <div class="grid-kpi">
          <div class="kpi"><span>Note moyenne</span><strong>{{ d.stats.ratingAvg | rating }}</strong>
            <span class="small muted">{{ d.stats.ratingCount }} avis</span></div>
          <div class="kpi"><span>Missions terminées</span><strong>{{ d.stats.completedMissions }}</strong>
            <span class="small muted">{{ d.stats.cancelledMissions }} annulée{{ d.stats.cancelledMissions > 1 ? 's' : '' }}</span></div>
          <div class="kpi"><span>Volume encaissé</span><strong>{{ d.stats.volumePaidFcfa | fcfa }}</strong>
            <span class="small muted">depuis l’inscription</span></div>
          <div class="kpi"><span>Propositions en cours</span><strong>{{ d.stats.pendingProposals }}</strong>
            <span class="small muted">en attente du client</span></div>
        </div>

        @if (d.description || d.yearsExperience) {
          <section class="card">
            <h3>Présentation</h3>
            <p style="margin: 0">
              @if (d.yearsExperience) { {{ d.yearsExperience }} ans d’expérience. }
              {{ d.description }}
            </p>
          </section>
        }

        @if (d.members.length > 1) {
          <section class="card">
            <h3>Équipe</h3>
            @for (m of d.members; track m.accountId) {
              @let v = m.verificationStatus | badge: 'provider';
              <div class="list-line">
                <span class="grow"><strong>{{ m.fullName }}</strong>
                  <span class="small muted">{{ m.role === 'MANAGER' ? 'Gérant' : 'Artisan' }} · {{ m.phone }}</span></span>
                <span class="pill {{ v.tone }}">{{ v.label }}</span>
              </div>
            }
          </section>
        }

        <div class="tabs" role="group" aria-label="Rubrique">
          @for (t of tabs; track t.value) {
            <button type="button" class="tab" [class.on]="tab() === t.value" [attr.aria-pressed]="tab() === t.value"
              (click)="tab.set(t.value)">{{ t.label }}</button>
          }
        </div>

        <section class="card">
          @switch (tab()) {
            @case ('missions') {
              @for (m of d.missions; track m.missionId) {
                @let ms = m.status | badge: 'mission';
                <a class="list-line" style="color: inherit; font-weight: 400" [routerLink]="['/requests', m.requestId]">
                  <span class="grow">
                    <strong>{{ m.title }}</strong>
                    <span class="small muted">{{ m.ref }} · {{ m.clientName }} · {{ m.district }} · {{ m.scheduledAt | dayTime }}</span>
                  </span>
                  <span>{{ m.priceFcfa | fcfa }}</span>
                  <span class="pill {{ ms.tone }}">{{ ms.label }}</span>
                </a>
              } @empty {
                <p class="muted" style="margin: 0">Aucune mission pour l’instant.</p>
              }
            }
            @case ('reviews') {
              @for (r of d.reviews; track $index) {
                <div class="list-line">
                  <span class="grow">
                    <strong>{{ r.rating }} étoile{{ r.rating > 1 ? 's' : '' }} · {{ r.clientName }}</strong>
                    <span class="small muted">
                      @if (r.comment) { « {{ r.comment }} » }
                      @if (r.tags) { {{ r.tags.split(',').join(', ') }} }
                    </span>
                  </span>
                  <span class="small muted">{{ r.createdAt | day }}</span>
                </div>
              } @empty {
                <p class="muted" style="margin: 0">Aucun avis pour l’instant.</p>
              }
            }
            @case ('history') {
              <app-history-list [entries]="d.history" />
            }
          }
        </section>
      }
    </div>
  `,
})
export class ProviderPage {
  private readonly api = inject(AdminApi);

  readonly id = input.required<string>();

  protected readonly tabs = [
    { value: 'missions', label: 'Missions' },
    { value: 'reviews', label: 'Avis' },
    { value: 'history', label: 'Historique admin' },
  ] as const;
  protected readonly tab = signal<'missions' | 'reviews' | 'history'>('missions');
  protected readonly detail = signal<ProviderDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly tradeLabels = computed(() => this.detail()?.trades.map((t) => t.label).join(', ') || 'Aucun métier');

  constructor() {
    effect(() => {
      this.id();
      this.reload();
    });
  }

  protected async reload(): Promise<void> {
    try {
      this.detail.set(await this.api.provider(Number(this.id())));
      this.error.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
