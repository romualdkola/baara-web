import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth';

// Routes de connexion : jamais de jeton, jamais de renouvellement
const PUBLIC = ['/auth/staff/login', '/auth/staff/2fa', '/auth/refresh', '/auth/logout'];

const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/**
 * Ajoute le jeton d'accès aux appels de l'API. Sur un 401, renouvelle la paire de jetons une fois puis rejoue
 * la requête ; si le renouvellement échoue, la session est close et on revient à la connexion.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(environment.apiUrl);
  if (!isApi || PUBLIC.some((p) => req.url.includes(p))) {
    return next(req);
  }
  return next(withToken(req, auth.accessToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(auth.refresh()).pipe(
        catchError(() => {
          auth.expire();
          return throwError(() => error);
        }),
        switchMap((token) => next(withToken(req, token))),
      );
    }),
  );
};
