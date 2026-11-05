import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApi } from '../../core/admin-api';
import { AuthService, errorMessage } from '../../core/auth';
import { Invited, StaffRole, StaffView } from '../../core/models';
import { AgoPipe, InitialsPipe } from '../../shared/format';
import { BadgePipe, ROLE_RIGHTS, ROLES } from '../../shared/labels';

/**
 * Équipe Baara : membres, rôles et droits. Le super admin invite (mot de passe provisoire affiché une seule fois),
 * change les rôles, suspend et réinitialise les accès.
 */
@Component({
  selector: 'app-team',
  imports: [FormsModule, AgoPipe, InitialsPipe, BadgePipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Équipe Baara</h1>
          <p class="muted">Chaque membre se connecte avec son e-mail, son mot de passe et un code de double authentification.</p>
        </div>
        @if (isAdmin()) {
          <button type="button" class="btn green" (click)="inviting.set(!inviting())">Inviter un membre</button>
        }
      </div>

      @if (inviting()) {
        <form class="card" (ngSubmit)="invite()">
          <h2>Nouveau membre</h2>
          <div class="grid">
            <label class="field">Nom complet
              <input name="fullName" required maxlength="100" [(ngModel)]="fullName" />
            </label>
            <label class="field">E-mail
              <input name="email" type="email" required maxlength="160" [(ngModel)]="email" />
            </label>
            <label class="field">Rôle
              <select name="role" [(ngModel)]="role">
                @for (r of roleList; track r) {
                  <option [value]="r">{{ roles[r] }} · {{ rights[r] }}</option>
                }
              </select>
            </label>
          </div>
          <div class="row">
            <button class="btn green" type="submit" [disabled]="busy() || !fullName.trim() || !email.trim()">Inviter</button>
            <button class="btn ghost" type="button" (click)="inviting.set(false)">Annuler</button>
          </div>
        </form>
      }

      @if (secret(); as s) {
        <div class="card" role="status">
          <h2>Accès de {{ s.staff.fullName }}</h2>
          <p style="margin: 0">
            Transmettez ce mot de passe provisoire à {{ s.staff.fullName }} par un canal sûr. Il ne sera plus affiché.
            À sa première connexion, il choisira son mot de passe et configurera sa double authentification.
          </p>
          <div class="row">
            <code class="secret">{{ s.temporaryPassword }}</code>
            <button type="button" class="btn small outline" (click)="copy(s.temporaryPassword)">{{ copied() ? 'Copié' : 'Copier' }}</button>
            <span class="spacer"></span>
            <button type="button" class="btn small" (click)="secret.set(null)">J’ai transmis le mot de passe</button>
          </div>
        </div>
      }

      @if (error()) {
        <div class="notice terra" role="alert">{{ error() }}</div>
      }

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Membre</th>
              <th>Rôle</th>
              <th>Droits</th>
              <th>Statut</th>
              <th>Dernière connexion</th>
              @if (isAdmin()) {
                <th><span class="visually-hidden">Actions</span></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (m of members(); track m.id) {
              @let s = m.status | badge: 'account';
              <tr>
                <td>
                  <div class="row" style="flex-wrap: nowrap">
                    <span class="avatar">{{ m.fullName | initials }}</span>
                    <span>
                      <div class="cell-main">{{ m.fullName }}@if (m.id === me()?.id) { <span class="cell-sub"> (vous)</span> }</div>
                      <div class="cell-sub">{{ m.email }}</div>
                    </span>
                  </div>
                </td>
                <td>
                  @if (isAdmin() && m.id !== me()?.id) {
                    <select [attr.aria-label]="'Rôle de ' + m.fullName" [ngModel]="m.role" (ngModelChange)="changeRole(m, $event)">
                      @for (r of roleList; track r) {
                        <option [value]="r">{{ roles[r] }}</option>
                      }
                    </select>
                  } @else {
                    {{ roles[m.role] }}
                  }
                </td>
                <td class="cell-sub">{{ rights[m.role] }}</td>
                <td>
                  <span class="pill {{ s.tone }}">{{ s.label }}</span>
                  @if (m.mustChangePassword) {
                    <div class="cell-sub">première connexion à faire</div>
                  }
                </td>
                <td class="cell-sub">{{ m.lastLoginAt ? (m.lastLoginAt | ago) : 'jamais' }}</td>
                @if (isAdmin()) {
                  <td style="text-align: right; white-space: nowrap">
                    @if (m.id !== me()?.id) {
                      <button type="button" class="btn small ghost" (click)="reset(m)">Réinitialiser l’accès</button>
                      <button type="button" class="btn small" [class.terra]="m.status === 'ACTIVE'" [class.green]="m.status !== 'ACTIVE'"
                        (click)="toggleStatus(m)">{{ m.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver' }}</button>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .secret {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 2px;
      padding: 8px 14px;
      border-radius: 12px;
      background: var(--sand);
    }
  `,
})
export class TeamPage {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);

  protected readonly roles = ROLES;
  protected readonly rights = ROLE_RIGHTS;
  protected readonly roleList: StaffRole[] = ['SUPPORT', 'MODERATOR', 'SUPER_ADMIN'];
  protected readonly me = this.auth.staff;
  protected readonly isAdmin = computed(() => this.auth.can('admin'));
  protected readonly members = signal<StaffView[]>([]);
  protected readonly inviting = signal(false);
  protected readonly secret = signal<Invited | null>(null);
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected fullName = '';
  protected email = '';
  protected role: StaffRole = 'SUPPORT';

  constructor() {
    this.run(async () => this.members.set(await this.api.staff()));
  }

  protected async invite(): Promise<void> {
    await this.run(async () => {
      const invited = await this.api.invite(this.email.trim(), this.fullName.trim(), this.role);
      this.members.update((list) => [...list, invited.staff]);
      this.show(invited);
      this.inviting.set(false);
      this.fullName = '';
      this.email = '';
    });
  }

  protected async changeRole(m: StaffView, role: StaffRole): Promise<void> {
    await this.run(async () => this.replace(await this.api.updateStaff(m.id, { role })));
  }

  protected async toggleStatus(m: StaffView): Promise<void> {
    await this.run(async () =>
      this.replace(await this.api.updateStaff(m.id, { status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })),
    );
  }

  protected async reset(m: StaffView): Promise<void> {
    await this.run(async () => {
      const invited = await this.api.resetAccess(m.id);
      this.replace(invited.staff);
      this.show(invited);
    });
  }

  protected async copy(text: string): Promise<void> {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    this.copied.set(true);
  }

  private show(invited: Invited): void {
    this.copied.set(false);
    this.secret.set(invited);
  }

  private replace(updated: StaffView): void {
    this.members.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (e) {
      this.error.set(errorMessage(e));
      // Une modification refusée laisse la liste telle qu'elle est en base
      this.members.set(await this.api.staff().catch(() => this.members()));
    } finally {
      this.busy.set(false);
    }
  }
}
