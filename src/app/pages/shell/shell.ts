import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AdminApi } from '../../core/admin-api';
import { AuthService } from '../../core/auth';
import { InitialsPipe } from '../../shared/format';
import { ROLES } from '../../shared/labels';

/** Cadre du back-office : menu latéral, membre connecté, contenu de l'écran. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, InitialsPipe],
  styleUrl: './shell.scss',
  template: `
    <div class="layout">
      <aside class="side">
        <a class="logo" routerLink="/"><span class="mark" aria-hidden="true">b</span>
          <span class="name">baara<small>Back-office</small></span></a>
        <nav aria-label="Menu principal">
          <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Tableau de bord</a>
          <a routerLink="/verifications" routerLinkActive="on">
            Vérifications
            @if (pending()) {
              <span class="count" [attr.aria-label]="pending() + ' en attente'">{{ pending() }}</span>
            }
          </a>
          <a routerLink="/providers" routerLinkActive="on">Prestataires</a>
          <a routerLink="/clients" routerLinkActive="on">Clients</a>
          <a routerLink="/requests" routerLinkActive="on">Demandes et missions</a>
          <a routerLink="/trades" routerLinkActive="on">Métiers</a>
          <a routerLink="/team" routerLinkActive="on">Équipe</a>
        </nav>
        @if (auth.staff(); as me) {
          <div class="me">
            <span class="avatar">{{ me.fullName | initials }}</span>
            <span class="who">
              <strong>{{ me.fullName }}</strong>
              <small>{{ roles[me.role] }}</small>
            </span>
            <button class="btn small outline light" type="button" (click)="auth.logout()">Sortir</button>
          </div>
        }
      </aside>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class Shell implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roles = ROLES;
  protected readonly pending = signal(0);

  ngOnInit(): void {
    this.refreshCount();
    // Le compteur des dossiers à vérifier suit les décisions prises d'un écran à l'autre
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshCount());
  }

  private refreshCount(): void {
    this.api
      .dashboard('TODAY')
      .then((d) => this.pending.set(d.todo.pendingVerifications))
      .catch(() => undefined);
  }
}
