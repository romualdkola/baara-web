import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService, Right } from './auth';

/** Espace réservé à l'équipe connectée ; un mot de passe provisoire mène d'abord à son changement. */
export const signedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const staff = auth.staff();
  if (!staff) return router.parseUrl('/login');
  if (staff.mustChangePassword) return router.parseUrl('/password');
  return true;
};

export const passwordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.staff() ? true : inject(Router).parseUrl('/login');
};

export const signedOutGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.staff() ? inject(Router).parseUrl('/') : true;
};

/** Écran réservé à un droit (les routes de l'API vérifient aussi, ceci évite d'afficher un écran inutile). */
export const rightGuard =
  (right: Right): CanActivateFn =>
  () =>
    inject(AuthService).can(right) ? true : inject(Router).parseUrl('/');
