import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApi } from '../../core/admin-api';
import { AuthService, errorMessage } from '../../core/auth';
import { TradeRow } from '../../core/models';

/**
 * Métiers proposés aux clients et aux prestataires, par famille. Un métier masqué n'accepte plus de nouvelles
 * demandes ; les demandes existantes ne bougent pas. Seul le super admin modifie le catalogue.
 */
@Component({
  selector: 'app-trades',
  imports: [FormsModule],
  styleUrl: './trades.scss',
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Métiers</h1>
          <p class="muted">Les métiers proposés aux clients et aux prestataires. Un métier masqué n’accepte plus de nouvelles demandes.</p>
        </div>
        @if (canEdit()) {
          <button type="button" class="btn green" (click)="adding.set(!adding())">+ Ajouter un métier</button>
        }
      </div>

      @if (adding()) {
        <form class="card row" (ngSubmit)="add()">
          <label class="field">Famille
            <input name="family" list="families" required [(ngModel)]="newFamily" placeholder="Maison" />
            <datalist id="families">
              @for (g of groups(); track g.family) {
                <option [value]="g.family"></option>
              }
            </datalist>
          </label>
          <label class="field grow">Métier
            <input name="label" required maxlength="100" [(ngModel)]="newLabel" placeholder="Vitrerie" />
          </label>
          <button class="btn green" type="submit" [disabled]="busy() || !newFamily.trim() || !newLabel.trim()">Ajouter</button>
        </form>
      }

      @if (error()) {
        <div class="notice terra" role="alert">{{ error() }}</div>
      }

      @for (g of groups(); track g.family) {
        <section class="card">
          <h2>{{ g.family }}</h2>
          <div class="trades">
            @for (t of g.trades; track t.id) {
              <div class="trade" [class.off]="!t.active">
                @if (editingId() === t.id) {
                  <input class="grow" [attr.aria-label]="'Nouveau nom de ' + t.label" [(ngModel)]="editLabel"
                    (keydown.enter)="rename(t)" (keydown.escape)="editingId.set(null)" />
                  <button type="button" class="btn small green" (click)="rename(t)">OK</button>
                } @else {
                  <span class="grow">
                    <strong>{{ t.label }}</strong>
                    <span class="small muted">{{ t.providerCount }} prestataire{{ t.providerCount > 1 ? 's' : '' }} ·
                      {{ t.requestCount }} demande{{ t.requestCount > 1 ? 's' : '' }}</span>
                  </span>
                  @if (canEdit()) {
                    <button type="button" class="btn small ghost" [attr.aria-label]="'Renommer ' + t.label"
                      (click)="startRename(t)">Renommer</button>
                    <button type="button" class="switch" role="switch" [attr.aria-checked]="t.active"
                      [attr.aria-label]="(t.active ? 'Masquer ' : 'Afficher ') + t.label" (click)="toggle(t)">
                      <span></span>
                    </button>
                  } @else if (!t.active) {
                    <span class="pill">Masqué</span>
                  }
                }
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class TradesPage {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);

  protected readonly canEdit = computed(() => this.auth.can('admin'));
  protected readonly trades = signal<TradeRow[]>([]);
  protected readonly groups = computed(() => {
    const byFamily = new Map<string, TradeRow[]>();
    for (const t of this.trades()) byFamily.set(t.family, [...(byFamily.get(t.family) ?? []), t]);
    return [...byFamily.entries()].map(([family, trades]) => ({ family, trades }));
  });
  protected readonly adding = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected newFamily = '';
  protected newLabel = '';
  protected editLabel = '';

  constructor() {
    this.load();
  }

  protected async add(): Promise<void> {
    await this.run(async () => {
      const created = await this.api.createTrade(this.newFamily.trim(), this.newLabel.trim());
      this.trades.update((list) => [...list, created]);
      this.newLabel = '';
      this.adding.set(false);
    });
  }

  protected async toggle(t: TradeRow): Promise<void> {
    await this.run(async () => this.replace(await this.api.updateTrade(t.id, { active: !t.active })));
  }

  protected startRename(t: TradeRow): void {
    this.editLabel = t.label;
    this.editingId.set(t.id);
  }

  protected async rename(t: TradeRow): Promise<void> {
    const label = this.editLabel.trim();
    if (!label || label === t.label) {
      this.editingId.set(null);
      return;
    }
    await this.run(async () => {
      this.replace(await this.api.updateTrade(t.id, { label }));
      this.editingId.set(null);
    });
  }

  private replace(updated: TradeRow): void {
    this.trades.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  }

  private async load(): Promise<void> {
    await this.run(async () => this.trades.set(await this.api.trades()));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
