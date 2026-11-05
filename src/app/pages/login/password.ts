import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService, errorMessage } from '../../core/auth';

/** Changement du mot de passe : obligatoire avec un mot de passe provisoire (invitation, réinitialisation). */
@Component({
  selector: 'app-password',
  imports: [FormsModule],
  styleUrl: './login.scss',
  template: `
    <div class="auth">
      <aside class="brand">
        <div class="logo"><span class="mark" aria-hidden="true">b</span> baara</div>
        <h1>Choisissez votre mot de passe</h1>
        <p>Le mot de passe provisoire ne sert qu’une fois. Le vôtre doit faire au moins 12 caractères.</p>
      </aside>
      <main class="panel">
        <form class="form" (ngSubmit)="submit()">
          <h2>Nouveau mot de passe</h2>
          <label class="field">
            Mot de passe actuel (provisoire)
            <input type="password" name="current" autocomplete="current-password" required [(ngModel)]="current" />
          </label>
          <label class="field">
            Nouveau mot de passe
            <input type="password" name="next" autocomplete="new-password" minlength="12" required [(ngModel)]="next" />
          </label>
          <label class="field">
            Confirmation
            <input type="password" name="confirm" autocomplete="new-password" required [(ngModel)]="confirm" />
          </label>
          @if (next && confirm && next !== confirm) {
            <div class="notice">Les deux mots de passe ne correspondent pas.</div>
          }
          @if (error()) {
            <div class="notice terra" role="alert">{{ error() }}</div>
          }
          <button
            class="btn green block"
            type="submit"
            [disabled]="busy() || !current || next.length < 12 || next !== confirm"
          >
            Enregistrer
          </button>
          <button class="btn ghost" type="button" (click)="auth.logout()">Se déconnecter</button>
        </form>
      </main>
    </div>
  `,
})
export class PasswordPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected current = '';
  protected next = '';
  protected confirm = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.changePassword(this.current, this.next);
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
