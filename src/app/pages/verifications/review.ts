import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminApi } from '../../core/admin-api';
import { AuthService, errorMessage } from '../../core/auth';
import { ReviewDetail } from '../../core/models';
import { AgoPipe, DayPipe, DayTimePipe, InitialsPipe } from '../../shared/format';
import { ActionPipe, BadgePipe, DOCUMENTS } from '../../shared/labels';
import { ReasonDialog } from '../../shared/reason-dialog';

/** Examen d'un dossier : pièces, points de contrôle, décision (validation ou refus motivé), historique. */
@Component({
  selector: 'app-review',
  imports: [RouterLink, AgoPipe, DayPipe, DayTimePipe, InitialsPipe, BadgePipe, ActionPipe, ReasonDialog],
  styleUrl: './review.scss',
  template: `
    <div class="page">
      <a routerLink="/verifications">← File de vérification</a>
      @if (error()) {
        <div class="notice terra" role="alert">{{ error() }}</div>
      }
      @if (detail(); as d) {
        @let status = d.status | badge: 'provider';
        <div class="row">
          <span class="avatar big">{{ d.fullName || d.businessName | initials }}</span>
          <div>
            <div class="row">
              <h1>{{ d.fullName || d.businessName }}</h1>
              <span class="pill {{ status.tone }}">{{ status.label }}</span>
            </div>
            <div class="muted">
              {{ tradeLabels() }} · {{ d.radiusKm }} km
              @if (d.yearsExperience) { · {{ d.yearsExperience }} ans d’expérience }
              · inscrit {{ d.accountCreatedAt | ago }}
            </div>
          </div>
        </div>

        <div class="split">
          <section class="card docs">
            <div class="row" role="group" aria-label="Pièces du dossier">
              @for (doc of d.documents; track doc.id; let i = $index) {
                <button type="button" class="btn small" [class.outline]="i !== docIndex()" (click)="docIndex.set(i)">
                  {{ documents[doc.type] || doc.type }}
                </button>
              }
            </div>
            <div class="viewer">
              @if (currentUrl(); as url) {
                <a [href]="url" target="_blank" rel="noopener" title="Ouvrir en grand">
                  <img [src]="url" [alt]="currentLabel()" />
                </a>
              } @else {
                <span class="muted">{{ d.documents.length ? 'Chargement de la pièce…' : 'Aucune pièce' }}</span>
              }
            </div>
            <div class="checks">
              @for (c of checks; track c; let i = $index) {
                <label><input type="checkbox" [checked]="checked()[i]" (change)="toggle(i)" /> {{ c }}</label>
              }
            </div>
          </section>

          <section class="card decision">
            <h2>Décision</h2>
            @if (d.status === 'PENDING') {
              @if (auth.can('moderate')) {
                <button type="button" class="btn green block" [disabled]="busy() || !allChecked()" (click)="approve()">
                  Valider le prestataire
                </button>
                <button type="button" class="btn outline-terra block" [disabled]="busy()" (click)="rejecting.set(true)">
                  Refuser ou demander un complément
                </button>
                @if (!allChecked()) {
                  <p class="small muted">Cochez les points de contrôle avant de valider.</p>
                }
              } @else {
                <div class="notice">Votre rôle permet de consulter ce dossier, pas de décider.</div>
              }
            } @else {
              <div class="notice" [class.green]="d.status === 'APPROVED'" [class.terra]="d.status === 'REJECTED'">
                <strong>{{ d.status === 'APPROVED' ? 'Prestataire validé' : 'Dossier refusé' }}</strong>
                @if (d.reviewedBy) { par {{ d.reviewedBy }} } · {{ d.reviewedAt | dayTime }}
                @if (d.reason) {
                  <div>Motif : {{ d.reason }}</div>
                }
              </div>
              <button type="button" class="btn block" (click)="next()">Dossier suivant</button>
            }
            <div class="small muted facts">
              <span>Téléphone vérifié par SMS · {{ d.phone }}</span>
              <span>Envoyé le {{ d.submittedAt | day }}</span>
              @if (d.previous.length) {
                <span>{{ d.previous.length }} dossier{{ d.previous.length > 1 ? 's' : '' }} précédent{{ d.previous.length > 1 ? 's' : '' }}</span>
              }
              <a [routerLink]="['/providers', d.businessId]">Fiche du prestataire</a>
            </div>
          </section>
        </div>

        @if (d.description) {
          <section class="card">
            <h3>Présentation</h3>
            <p style="margin: 0">{{ d.description }}</p>
          </section>
        }

        <section class="card">
          <h3>Historique</h3>
          @for (h of d.history; track h.id) {
            <div class="list-line">
              <span class="grow">
                <strong>{{ h.action | action }}</strong>
                <span class="small muted">{{ h.staffName ? 'par ' + h.staffName : 'automatique' }}@if (h.note) { · {{ h.note }} }</span>
              </span>
              <span class="small muted">{{ h.createdAt | dayTime }}</span>
            </div>
          } @empty {
            <p class="muted" style="margin: 0">Aucune action de l’équipe pour l’instant.</p>
          }
        </section>
      }
    </div>

    @if (rejecting()) {
      <app-reason-dialog
        title="Refuser le dossier"
        message="Le motif est envoyé au prestataire par SMS. Il pourra corriger son dossier depuis l’app."
        confirmLabel="Envoyer le refus"
        [presets]="reasons"
        [busy]="busy()"
        (cancelled)="rejecting.set(false)"
        (confirmed)="reject($event)"
      />
    }
  `,
})
export class ReviewPage {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly documents = DOCUMENTS;
  protected readonly checks = [
    'Le nom correspond à la pièce',
    'Le visage correspond au selfie',
    'La pièce est en cours de validité',
    'Les photos sont nettes et complètes',
  ];
  protected readonly reasons = [
    'Pièce illisible ou coupée',
    'Selfie ne correspondant pas à la pièce',
    'Pièce expirée',
    'Photo de la pièce manquante',
  ];

  protected readonly detail = signal<ReviewDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly docIndex = signal(0);
  protected readonly checked = signal<boolean[]>([false, false, false, false]);
  private readonly urls = signal<Record<number, string>>({});

  protected readonly allChecked = computed(() => this.checked().every(Boolean));
  protected readonly tradeLabels = computed(() => this.detail()?.trades.map((t) => t.label).join(', ') || 'Aucun métier');
  protected readonly currentDoc = computed(() => this.detail()?.documents[this.docIndex()] ?? null);
  protected readonly currentUrl = computed(() => {
    const doc = this.currentDoc();
    return doc ? (this.urls()[doc.id] ?? null) : null;
  });
  protected readonly currentLabel = computed(() => {
    const doc = this.currentDoc();
    return doc ? (DOCUMENTS[doc.type] ?? doc.type) : '';
  });

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.detail.set(null);
      this.docIndex.set(0);
      this.checked.set([false, false, false, false]);
      this.load(id);
    });
    // Les pièces s'ouvrent par une URL signée, demandée à l'affichage de chacune
    effect(() => {
      const doc = this.currentDoc();
      if (doc && !this.urls()[doc.id]) {
        this.api
          .documentUrl(doc.id)
          .then((url) => this.urls.update((u) => ({ ...u, [doc.id]: url })))
          .catch((e) => this.error.set(errorMessage(e)));
      }
    });
  }

  protected toggle(i: number): void {
    this.checked.update((c) => c.map((v, j) => (j === i ? !v : v)));
  }

  protected approve(): void {
    this.decide(() => this.api.approve(this.detail()!.id));
  }

  protected reject(reason: string): void {
    this.decide(() => this.api.reject(this.detail()!.id, reason)).then(() => this.rejecting.set(false));
  }

  /** Dossier en attente suivant, sinon retour à la file. */
  protected async next(): Promise<void> {
    const pending = await this.api.verifications('PENDING', '').catch(() => []);
    const next = pending.find((p) => p.id !== this.detail()?.id);
    await this.router.navigate(next ? ['/verifications', next.id] : ['/verifications']);
  }

  private async decide(action: () => Promise<ReviewDetail>): Promise<void> {
    this.busy.set(true);
    try {
      this.detail.set(await action());
      this.error.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(id: number): Promise<void> {
    try {
      this.detail.set(await this.api.verification(id));
      this.error.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
