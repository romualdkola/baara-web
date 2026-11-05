import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService, errorMessage } from './auth';
import { StaffRole, StaffView } from './models';

function staff(role: StaffRole, mustChangePassword = false): StaffView {
  return { id: 1, email: 'a@baara.test', fullName: 'Mariam Touré', role, status: 'ACTIVE', mustChangePassword, lastLoginAt: null };
}

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  it('donne à chaque rôle les droits de l’API', () => {
    auth.staff.set(staff('SUPPORT'));
    expect([auth.can('read'), auth.can('moderate'), auth.can('admin')]).toEqual([true, false, false]);
    auth.staff.set(staff('MODERATOR'));
    expect([auth.can('read'), auth.can('moderate'), auth.can('admin')]).toEqual([true, true, false]);
    auth.staff.set(staff('SUPER_ADMIN'));
    expect([auth.can('read'), auth.can('moderate'), auth.can('admin')]).toEqual([true, true, true]);
  });

  it('ne donne aucun droit avec un mot de passe provisoire ou sans session', () => {
    auth.staff.set(staff('SUPER_ADMIN', true));
    expect(auth.can('read')).toBe(false);
    auth.staff.set(null);
    expect(auth.can('read')).toBe(false);
  });
});

describe('errorMessage', () => {
  it('reprend le message de l’API, ou le premier détail de validation', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 409, error: { code: 'X', message: 'Ce dossier a déjà été traité' } })))
      .toBe('Ce dossier a déjà été traité');
    expect(errorMessage(new HttpErrorResponse({ status: 400, error: { message: 'Validation', details: { reason: 'ne doit pas être vide' } } })))
      .toBe('ne doit pas être vide');
  });

  it('explique une coupure réseau et un refus de droits', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('serveur');
    expect(errorMessage(new HttpErrorResponse({ status: 403 }))).toBe('Votre rôle ne permet pas cette action.');
  });
});
