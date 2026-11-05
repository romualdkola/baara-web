import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toDataURL } from 'qrcode';

import { AuthService, errorMessage } from '../../core/auth';
import { StaffChallenge } from '../../core/models';

/**
 * Connexion de l'équipe en deux temps : e-mail et mot de passe, puis code de l'appli d'authentification.
 * À la première connexion, le QR code à scanner est affiché avec la clé à saisir à la main.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  styleUrl: './login.scss',
  template: `
    <div class="auth">
      <aside class="brand">
        <div class="logo"><span class="mark" aria-hidden="true">b</span> baara</div>
        <h1>Le back-office de l’équipe</h1>
        <p>Vérifier les artisans, suivre les demandes, garder la confiance des clients.</p>
      </aside>

      <main class="panel">
        @if (!challenge()) {
          <form class="form" (ngSubmit)="submitPassword()">
            <h2>Connexion</h2>
            <label class="field">
              E-mail
              <input type="email" name="email" autocomplete="username" required [(ngModel)]="email" />
            </label>
            <label class="field">
              Mot de passe
              <input type="password" name="password" autocomplete="current-password" required [(ngModel)]="password" />
            </label>
            @if (error()) {
              <div class="notice terra" role="alert">{{ error() }}</div>
            }
            <button class="btn green block" type="submit" [disabled]="busy() || !email || !password">Continuer</button>
          </form>
        } @else {
          <form class="form" (ngSubmit)="submitCode()">
            <h2>Double authentification</h2>
            @if (qr()) {
              <p class="muted">
                Première connexion : scannez ce code avec une appli d’authentification (Google Authenticator,
                Microsoft Authenticator…), puis saisissez le code à 6 chiffres qu’elle affiche.
              </p>
              <img class="qr" [src]="qr()" alt="QR code à scanner dans l’appli d’authentification" />
              <p class="small muted">Clé à saisir à la main : <code>{{ challenge()!.enrollment!.secret }}</code></p>
            } @else {
              <p class="muted">Saisissez le code à 6 chiffres affiché par votre appli d’authentification.</p>
            }
            <label class="field">
              Code
              <input
                class="code-input"
                name="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                required
                [(ngModel)]="code"
              />
            </label>
            @if (error()) {
              <div class="notice terra" role="alert">{{ error() }}</div>
            }
            <button class="btn green block" type="submit" [disabled]="busy() || code.length !== 6">Se connecter</button>
            <button class="btn ghost" type="button" (click)="restart()">Recommencer</button>
          </form>
        }
      </main>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected code = '';
  protected readonly challenge = signal<StaffChallenge | null>(null);
  protected readonly qr = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submitPassword(): Promise<void> {
    await this.run(async () => {
      const challenge = await this.auth.login(this.email.trim(), this.password);
      this.password = '';
      if (challenge.enrollment) {
        this.qr.set(await toDataURL(challenge.enrollment.otpauthUri, { width: 220, margin: 1 }));
      }
      this.challenge.set(challenge);
    });
  }

  protected async submitCode(): Promise<void> {
    await this.run(async () => {
      const staff = await this.auth.verify(this.challenge()!.challengeToken, this.code.trim());
      await this.router.navigateByUrl(staff.mustChangePassword ? '/password' : '/');
    });
  }

  protected restart(): void {
    this.challenge.set(null);
    this.qr.set(null);
    this.code = '';
    this.error.set(null);
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
