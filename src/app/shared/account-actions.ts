import { Component, inject, input, output, signal } from '@angular/core';

import { AdminApi } from '../core/admin-api';
import { AuthService, errorMessage } from '../core/auth';
import { AccountStatus } from '../core/models';
import { ReasonDialog } from './reason-dialog';

/**
 * Actions sur un compte depuis une fiche : note interne (tout le monde), suspension et réactivation
 * (modération). Prévient la fiche pour qu'elle se recharge.
 */
@Component({
  selector: 'app-account-actions',
  imports: [ReasonDialog],
  template: `
    <div class="row">
      <button type="button" class="btn outline small" (click)="mode.set('note')">Ajouter une note</button>
      @if (auth.can('moderate')) {
        @if (status() === 'SUSPENDED') {
          <button type="button" class="btn green small" (click)="mode.set('reactivate')">Réactiver le compte</button>
        } @else {
          <button type="button" class="btn terra small" (click)="mode.set('suspend')">Suspendre</button>
        }
      }
    </div>
    @if (error()) {
      <div class="notice terra" role="alert">{{ error() }}</div>
    }

    @switch (mode()) {
      @case ('note') {
        <app-reason-dialog title="Note interne" message="Visible seulement par l’équipe, dans l’historique du compte."
          fieldLabel="Note" confirmLabel="Enregistrer" tone="green" [busy]="busy()"
          (cancelled)="mode.set(null)" (confirmed)="run('note', $event)" />
      }
      @case ('suspend') {
        <app-reason-dialog title="Suspendre le compte"
          [message]="'Déconnexion immédiate. ' + subject() + ' ne peut plus utiliser l’app et sort des recherches et de la corbeille.'"
          confirmLabel="Suspendre" [presets]="suspendReasons" [busy]="busy()"
          (cancelled)="mode.set(null)" (confirmed)="run('suspend', $event)" />
      }
      @case ('reactivate') {
        <app-reason-dialog title="Réactiver le compte" message="Le compte retrouve l’accès à l’app."
          fieldLabel="Note (facultatif)" confirmLabel="Réactiver" tone="green" [required]="false" [busy]="busy()"
          (cancelled)="mode.set(null)" (confirmed)="run('reactivate', $event)" />
      }
    }
  `,
})
export class AccountActions {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AdminApi);

  readonly accountId = input.required<number>();
  readonly status = input.required<AccountStatus>();
  readonly subject = input('Ce compte');
  readonly changed = output<void>();

  protected readonly suspendReasons = [
    'Signalements répétés de clients',
    'Signalements répétés de prestataires',
    'Comportement inapproprié',
    'Fraude ou paiement contourné',
  ];
  protected readonly mode = signal<'note' | 'suspend' | 'reactivate' | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async run(action: 'note' | 'suspend' | 'reactivate', text: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const id = this.accountId();
      if (action === 'note') await this.api.addNote(id, text);
      else if (action === 'suspend') await this.api.suspend(id, text);
      else await this.api.reactivate(id, text);
      this.mode.set(null);
      this.changed.emit();
    } catch (e) {
      this.error.set(errorMessage(e));
      this.mode.set(null);
    } finally {
      this.busy.set(false);
    }
  }
}
