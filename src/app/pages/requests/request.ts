import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/auth';
import { AdminRequestDetail } from '../../core/models';
import { DayPipe, DayTimePipe, FcfaPipe } from '../../shared/format';
import { BadgePipe } from '../../shared/labels';

const SLOTS: Record<string, string> = { MORNING: 'matin', AFTERNOON: 'après-midi', EVENING: 'soir', ANYTIME: 'peu importe' };

/** Détail d'une demande : client, besoin, propositions reçues, mission et ses étapes. */
@Component({
  selector: 'app-request',
  imports: [RouterLink, BadgePipe, DayPipe, DayTimePipe, FcfaPipe],
  template: `
    <div class="page">
      <a routerLink="/requests">← Demandes et missions</a>
      @if (error()) {
        <div class="notice terra" role="alert">{{ error() }}</div>
      }
      @if (detail(); as d) {
        @let r = d.request;
        @let status = r.status | badge: 'request';
        <div class="page-head">
          <div>
            <div class="muted">{{ d.ref }} · {{ r.trade.label }} · créée le {{ r.createdAt | dayTime }}</div>
            <div class="row">
              <h1>{{ r.title }}</h1>
              <span class="pill {{ status.tone }}">{{ status.label }}</span>
              @if (r.urgent) {
                <span class="pill terra-soft">Urgent</span>
              }
            </div>
          </div>
        </div>

        <div class="grid">
          <section class="card">
            <h3>Besoin</h3>
            @if (r.description) {
              <p style="margin: 0">{{ r.description }}</p>
            }
            <div class="list-line"><span class="grow muted">Lieu</span><strong>{{ r.district }}</strong></div>
            @if (r.address) {
              <div class="list-line"><span class="grow muted">Adresse</span><strong>{{ r.address }}</strong></div>
            }
            <div class="list-line"><span class="grow muted">Quand</span>
              <strong>{{ r.preferredDate ? (r.preferredDate | day) + ', ' : '' }}{{ slot() }}</strong></div>
            <div class="list-line"><span class="grow muted">Budget</span><strong>{{ r.budgetFcfa | fcfa }}</strong></div>
            <div class="list-line"><span class="grow muted">Mode</span>
              <strong>{{ r.mode === 'INVITATION' ? 'Invitation directe' : 'Corbeille' }}</strong></div>
            @if (r.cancellationReason) {
              <div class="notice">Annulée : {{ r.cancellationReason }}</div>
            }
          </section>

          <section class="card">
            <h3>Client</h3>
            @let cs = d.client.status | badge: 'account';
            <div class="row">
              <strong>{{ d.client.fullName || 'Sans nom' }}</strong>
              <span class="pill {{ cs.tone }}">{{ cs.label }}</span>
            </div>
            <div class="muted">{{ d.client.phone }}</div>
            <a routerLink="/clients">Voir la liste des clients</a>
          </section>
        </div>

        <section class="card">
          <h3>Propositions ({{ r.proposals.length }})</h3>
          @for (p of r.proposals; track p.id) {
            @let ps = p.status | badge: 'proposal';
            <div class="list-line">
              <span class="grow">
                <a [routerLink]="['/providers', p.business.id]"><strong>{{ p.business.displayName }}</strong></a>
                <span class="small muted">
                  {{ p.partsIncluded ? 'pièces comprises' : 'pièces en plus' }}
                  @if (p.proposedAt) { · passage {{ p.proposedAt | dayTime }} }
                  @if (p.message) { · « {{ p.message }} » }
                </span>
              </span>
              <strong>{{ p.priceFcfa | fcfa }}</strong>
              <span class="pill {{ ps.tone }}">{{ ps.label }}</span>
            </div>
          } @empty {
            <p class="muted" style="margin: 0">Aucune proposition envoyée au client.</p>
          }
        </section>

        @if (r.mission; as m) {
          @let ms = m.status | badge: 'mission';
          <section class="card">
            <div class="row">
              <h3>Mission</h3>
              <span class="pill {{ ms.tone }}">{{ ms.label }}</span>
              <span class="spacer"></span>
              <strong>{{ m.priceFcfa | fcfa }}</strong>
            </div>
            <div class="muted">
              <a [routerLink]="['/providers', m.business.id]">{{ m.business.displayName }}</a>
              @if (m.artisanName) { · {{ m.artisanName }} }
            </div>
            @for (step of steps(); track step.label) {
              <div class="list-line">
                <span class="pill" [class.green]="!!step.at">{{ step.at ? '✓' : '·' }}</span>
                <span class="grow">{{ step.label }}</span>
                <span class="small muted">{{ step.at | dayTime }}</span>
              </div>
            }
            @if (m.paidAt) {
              <div class="notice green">Payée en espèces le {{ m.paidAt | dayTime }}@if (m.reviewed) { · avis laissé }</div>
            }
          </section>
        }
      }
    </div>
  `,
})
export class RequestPage {
  private readonly api = inject(AdminApi);

  readonly id = input.required<string>();

  protected readonly detail = signal<AdminRequestDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly slot = computed(() => SLOTS[this.detail()?.request.timeSlot ?? ''] ?? '');
  protected readonly steps = computed(() => {
    const m = this.detail()?.request.mission;
    if (!m) return [];
    return [
      { label: 'Prévue', at: m.scheduledAt },
      { label: 'En route', at: m.enRouteAt },
      { label: 'Sur place', at: m.onSiteAt },
      { label: 'Travaux commencés', at: m.startedAt },
      { label: 'Travaux terminés', at: m.doneAt },
      { label: 'Confirmée par le client', at: m.confirmedAt },
    ];
  });

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.api
        .request(id)
        .then((d) => {
          this.detail.set(d);
          this.error.set(null);
        })
        .catch((e) => this.error.set(errorMessage(e)));
    });
  }
}
