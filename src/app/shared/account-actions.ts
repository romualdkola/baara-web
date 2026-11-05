import { Component, effect, inject, input, output, signal } from '@angular/core';

import { AdminApi } from '../core/admin-api';
import { AuthService, errorMessage } from '../core/auth';
import { AccountStatus } from '../core/models';
import { ReasonDialog } from './reason-dialog';

/**
 * Actions sur un compte depuis une fiche : note interne (tout le monde), suspension, réactivation et
 * mot de passe provisoire (modération). Prévient la fiche pour qu'elle se recharge.
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
        <button type="button" class="btn outline small" (click)="mode.set('password')">Réinitialiser le mot de passe</button>
      }
    </div>
    @if (secret(); as password) {
      <div class="card" role="status">
        <h2>Mot de passe provisoire</h2>
        <p style="margin: 0">
          Transmettez-le à {{ subject() }} par un canal sûr. Il ne sera plus affiché. Il servira à se connecter une fois,
          puis l’app demandera d’en choisir un nouveau.
        </p>
        <div class="row">
          <code class="secret">{{ password }}</code>
          <button type="button" class="btn small outline" (click)="copy(password)">{{ copied() ? 'Copié' : 'Copier' }}</button>
          <span class="spacer"></span>
          <button type="button" class="btn small" (click)="secret.set(null)">J’ai transmis le mot de passe</button>
        </div>
      </div>
    }
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
      @case ('password') {
        <div class="card" role="dialog" aria-label="Réinitialiser le mot de passe">
          <h2>Réinitialiser le mot de passe</h2>
          <p style="margin: 0">
            {{ subject() }} sera déconnecté de tous ses appareils et recevra un mot de passe provisoire, à changer
            à la connexion. À réserver aux personnes qui n’ont pas accès à leur e-mail.
          </p>
          <div class="row">
            <span class="spacer"></span>
            <button type="button" class="btn outline small" [disabled]="busy()" (click)="mode.set(null)">Annuler</button>
            <button type="button" class="btn terra small" [disabled]="busy()" (click)="resetPassword()">Réinitialiser</button>
          </div>
        </div>
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
  protected readonly mode = signal<'note' | 'suspend' | 'reactivate' | 'password' | null>(null);
  protected readonly secret = signal<string | null>(null);
  protected readonly copied = signal(false);

  constructor() {
    // La liste des clients garde le composant d'une fiche à l'autre : rien ne doit suivre sur le compte suivant
    effect(() => {
      this.accountId();
      this.mode.set(null);
      this.secret.set(null);
    });
  }
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

  protected async resetPassword(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.api.resetPassword(this.accountId());
      this.copied.set(false);
      this.secret.set(result.temporaryPassword);
      this.changed.emit();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.mode.set(null);
      this.busy.set(false);
    }
  }

  protected async copy(text: string): Promise<void> {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    this.copied.set(true);
  }
}
