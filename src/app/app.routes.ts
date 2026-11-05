import { Routes } from '@angular/router';

import { passwordGuard, rightGuard, signedInGuard, signedOutGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [signedOutGuard],
    title: 'Connexion · Baara',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'password',
    canActivate: [passwordGuard],
    title: 'Mot de passe · Baara',
    loadComponent: () => import('./pages/login/password').then((m) => m.PasswordPage),
  },
  {
    path: '',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', title: 'Tableau de bord · Baara', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage) },
      { path: 'verifications', title: 'Vérifications · Baara', loadComponent: () => import('./pages/verifications/queue').then((m) => m.VerificationQueuePage) },
      { path: 'verifications/:id', title: 'Dossier · Baara', loadComponent: () => import('./pages/verifications/review').then((m) => m.ReviewPage) },
      { path: 'providers', title: 'Prestataires · Baara', loadComponent: () => import('./pages/providers/providers').then((m) => m.ProvidersPage) },
      { path: 'providers/:id', title: 'Prestataire · Baara', loadComponent: () => import('./pages/providers/provider').then((m) => m.ProviderPage) },
      { path: 'clients', title: 'Clients · Baara', loadComponent: () => import('./pages/clients/clients').then((m) => m.ClientsPage) },
      { path: 'requests', title: 'Demandes et missions · Baara', loadComponent: () => import('./pages/requests/requests').then((m) => m.RequestsPage) },
      { path: 'requests/:id', title: 'Demande · Baara', loadComponent: () => import('./pages/requests/request').then((m) => m.RequestPage) },
      { path: 'trades', title: 'Métiers · Baara', loadComponent: () => import('./pages/trades/trades').then((m) => m.TradesPage) },
      {
        path: 'team',
        title: 'Équipe · Baara',
        canActivate: [rightGuard('read')],
        loadComponent: () => import('./pages/team/team').then((m) => m.TeamPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
