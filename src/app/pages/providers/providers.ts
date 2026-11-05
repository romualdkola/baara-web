import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/auth';
import { ProviderRow, ProviderStatusFilter, TradeRow } from '../../core/models';
import { AgoPipe, RatingPipe } from '../../shared/format';
import { BadgePipe } from '../../shared/labels';

/** Prestataires : onglets par statut, filtre par métier, recherche, export CSV de la liste affichée. */
@Component({
  selector: 'app-providers',
  imports: [FormsModule, AgoPipe, RatingPipe, BadgePipe],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Prestataires</h1>
        <button type="button" class="btn outline" [disabled]="!rows().length" (click)="exportCsv()">Exporter (CSV)</button>
      </div>
      <div class="row">
        <div class="tabs" role="group" aria-label="Statut">
          @for (t of tabs; track t.label) {
            <button type="button" class="tab" [class.on]="status() === t.value" [attr.aria-pressed]="status() === t.value"
              (click)="status.set(t.value)">{{ t.label }}</button>
          }
        </div>
        <label class="row small" style="font-weight: 700">
          Métier
          <select [ngModel]="tradeId()" (ngModelChange)="tradeId.set($event)" aria-label="Filtrer par métier">
            <option [ngValue]="null">Tous</option>
            @for (t of trades(); track t.id) {
              <option [ngValue]="t.id">{{ t.label }}</option>
            }
          </select>
        </label>
        <input class="search" type="search" placeholder="Nom, téléphone ou entreprise" aria-label="Rechercher un prestataire"
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
                <th>Note</th>
                <th>Missions</th>
                <th>Statut</th>
                <th>Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              @for (p of rows(); track p.businessId) {
                @let status = p.status | badge: 'provider';
                <tr class="clickable" tabindex="0" (click)="open(p)" (keydown.enter)="open(p)">
                  <td>
                    <div class="cell-main">{{ p.businessName }}</div>
                    <div class="cell-sub">{{ p.fullName }} · {{ p.phone }}</div>
                  </td>
                  <td>{{ p.trades || '—' }}</td>
                  <td class="cell-main">{{ p.ratingAvg | rating }}@if (p.ratingCount) { <span class="cell-sub">({{ p.ratingCount }})</span> }</td>
                  <td>{{ p.completedMissions }}</td>
                  <td><span class="pill {{ status.tone }}">{{ status.label }}</span></td>
                  <td class="cell-sub">{{ p.lastActivityAt | ago }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!loading()) {
        <div class="card empty">Aucun prestataire ne correspond.</div>
      }
    </div>
  `,
})
export class ProvidersPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);

  protected readonly tabs: { value: ProviderStatusFilter | null; label: string }[] = [
    { value: null, label: 'Tous' },
    { value: 'VERIFIED', label: 'Vérifiés' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'SUSPENDED', label: 'Suspendus' },
  ];
  protected readonly status = signal<ProviderStatusFilter | null>(null);
  protected readonly tradeId = signal<number | null>(null);
  protected readonly q = signal('');
  protected readonly rows = signal<ProviderRow[]>([]);
  protected readonly trades = signal<TradeRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.trades().then((t) => this.trades.set(t)).catch(() => undefined);
    effect((onCleanup) => {
      const filter = { status: this.status(), tradeId: this.tradeId(), q: this.q() };
      const timer = setTimeout(() => this.load(filter), filter.q ? 250 : 0);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected open(p: ProviderRow): void {
    this.router.navigate(['/providers', p.businessId]);
  }

  /** Export de la liste affichée, séparateur point-virgule pour Excel en français. */
  protected exportCsv(): void {
    const head = ['Entreprise', 'Nom', 'Téléphone', 'Métiers', 'Note', 'Avis', 'Missions', 'Statut', 'Inscrit le'];
    const lines = this.rows().map((p) =>
      [p.businessName, p.fullName ?? '', p.phone, p.trades ?? '', p.ratingAvg ?? '', p.ratingCount, p.completedMissions,
        p.status, p.createdAt.slice(0, 10)].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'),
    );
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prestataires-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private async load(filter: { status: ProviderStatusFilter | null; tradeId: number | null; q: string }): Promise<void> {
    this.loading.set(true);
    try {
      this.rows.set(await this.api.providers(filter));
      this.error.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
