import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { StaffChallenge, StaffRole, StaffSession, StaffView, TokenPair } from './models';

const ACCESS = 'baara.access';
const REFRESH = 'baara.refresh';

/** Droits de l'équipe, comme côté API : le support consulte, la modération décide, le super admin configure. */
export type Right = 'read' | 'moderate' | 'admin';
const RIGHTS: Record<StaffRole, Right[]> = {
  SUPPORT: ['read'],
  MODERATOR: ['read', 'moderate'],
  SUPER_ADMIN: ['read', 'moderate', 'admin'],
};

/**
 * Session du membre de l'équipe. Les jetons vivent dans le stockage de l'onglet (sessionStorage) :
 * fermer le navigateur déconnecte, ce qui convient à un outil d'administration.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/api/v2`;

  readonly staff = signal<StaffView | null>(null);
  readonly ready = signal(false);
  readonly signedIn = computed(() => this.staff() !== null);

  get accessToken(): string | null {
    return sessionStorage.getItem(ACCESS);
  }

  can(right: Right): boolean {
    const staff = this.staff();
    return !!staff && !staff.mustChangePassword && RIGHTS[staff.role].includes(right);
  }

  /** Au démarrage : reprend la session de l'onglet s'il y en a une. */
  async restore(): Promise<void> {
    try {
      if (sessionStorage.getItem(REFRESH)) {
        this.staff.set(await firstValueFrom(this.http.get<StaffView>(`${this.base}/admin/me`)));
      }
    } catch {
      this.clear();
    } finally {
      this.ready.set(true);
    }
  }

  login(email: string, password: string): Promise<StaffChallenge> {
    return firstValueFrom(this.http.post<StaffChallenge>(`${this.base}/auth/staff/login`, { email, password }));
  }

  async verify(challengeToken: string, code: string): Promise<StaffView> {
    const session = await firstValueFrom(
      this.http.post<StaffSession>(`${this.base}/auth/staff/2fa`, { challengeToken, code }),
    );
    this.store(session.tokens);
    this.staff.set(session.staff);
    return session.staff;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.staff.set(
      await firstValueFrom(
        this.http.post<StaffView>(`${this.base}/admin/me/password`, { currentPassword, newPassword }),
      ),
    );
  }

  /** Renouvelle la paire de jetons ; une seule tentative à la fois, partagée par les requêtes en attente. */
  private refreshing: Promise<string> | null = null;

  refresh(): Promise<string> {
    if (!this.refreshing) {
      const refreshToken = sessionStorage.getItem(REFRESH);
      this.refreshing = (async () => {
        if (!refreshToken) throw new Error('no session');
        const pair = await firstValueFrom(this.http.post<TokenPair>(`${this.base}/auth/refresh`, { refreshToken }));
        this.store(pair);
        return pair.accessToken;
      })().finally(() => (this.refreshing = null));
    }
    return this.refreshing;
  }

  async logout(): Promise<void> {
    const refreshToken = sessionStorage.getItem(REFRESH);
    if (refreshToken) {
      // La session locale est fermée même si l'API ne répond pas
      await firstValueFrom(this.http.post(`${this.base}/auth/logout`, { refreshToken })).catch(() => undefined);
    }
    this.expire();
  }

  /** Session terminée ou refusée : retour à la connexion. */
  expire(): void {
    this.clear();
    this.router.navigateByUrl('/login');
  }

  private store(pair: TokenPair): void {
    sessionStorage.setItem(ACCESS, pair.accessToken);
    sessionStorage.setItem(REFRESH, pair.refreshToken);
  }

  private clear(): void {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
    this.staff.set(null);
  }
}

/** Message lisible d'une erreur de l'API (corps { code, message }) ou du réseau. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    const body = error.error as { message?: string; details?: Record<string, string> } | null;
    if (body?.details && typeof body.details === 'object') {
      const first = Object.values(body.details)[0];
      if (first) return first;
    }
    if (body?.message) return body.message;
    if (error.status === 403) return 'Votre rôle ne permet pas cette action.';
  }
  return 'Une erreur est survenue. Réessayez.';
}
