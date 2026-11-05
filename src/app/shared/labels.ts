import { Pipe, PipeTransform } from '@angular/core';

/** Libellé et classe de pastille (voir .pill dans styles.scss) d'un statut renvoyé par l'API. */
export interface Badge {
  label: string;
  tone: string;
}

const REQUEST: Record<string, Badge> = {
  DRAFT: { label: 'Brouillon', tone: '' },
  PUBLISHED: { label: 'Publiée', tone: 'terra-soft' },
  OFFERS_RECEIVED: { label: 'Propositions reçues', tone: 'yellow' },
  ASSIGNED: { label: 'Artisan retenu', tone: 'green-soft' },
  IN_PROGRESS: { label: 'En cours', tone: 'green-soft' },
  COMPLETED: { label: 'Terminée', tone: '' },
  PAID: { label: 'Payée', tone: 'green' },
  REVIEWED: { label: 'Notée', tone: 'green' },
  CANCELLED: { label: 'Annulée', tone: '' },
  DISPUTED: { label: 'Litige', tone: 'terra' },
};

const PROVIDER: Record<string, Badge> = {
  APPROVED: { label: 'Vérifié', tone: 'green' },
  PENDING: { label: 'En attente', tone: 'yellow-soft' },
  DRAFT: { label: 'Dossier à envoyer', tone: '' },
  REJECTED: { label: 'Refusé', tone: 'terra-soft' },
  SUSPENDED: { label: 'Suspendu', tone: 'terra-soft' },
};

const ACCOUNT: Record<string, Badge> = {
  ACTIVE: { label: 'Actif', tone: 'green-soft' },
  SUSPENDED: { label: 'Suspendu', tone: 'terra-soft' },
};

const MISSION: Record<string, Badge> = {
  SCHEDULED: { label: 'Prévue', tone: 'green-soft' },
  EN_ROUTE: { label: 'En route', tone: 'yellow' },
  ON_SITE: { label: 'Sur place', tone: 'yellow' },
  IN_PROGRESS: { label: 'Travaux en cours', tone: 'yellow' },
  DONE_BY_PROVIDER: { label: 'Attente du client', tone: 'yellow-soft' },
  CONFIRMED: { label: 'Terminée', tone: 'green' },
  CANCELLED: { label: 'Annulée', tone: '' },
};

const PROPOSAL: Record<string, Badge> = {
  AWAITING_MANAGER: { label: 'À valider par le gérant', tone: 'yellow-soft' },
  SENT: { label: 'Envoyée', tone: 'yellow-soft' },
  ACCEPTED: { label: 'Retenue', tone: 'green' },
  DECLINED: { label: 'Non retenue', tone: '' },
  WITHDRAWN: { label: 'Retirée', tone: '' },
  EXPIRED: { label: 'Expirée', tone: '' },
};

export const ROLES: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  MODERATOR: 'Modérateur',
  SUPPORT: 'Support',
};

export const ROLE_RIGHTS: Record<string, string> = {
  SUPER_ADMIN: 'Tout, y compris métiers et équipe',
  MODERATOR: 'Vérifications et suspensions',
  SUPPORT: 'Consultation et notes internes',
};

export const DOCUMENTS: Record<string, string> = {
  ID_FRONT: 'Pièce d’identité, recto',
  ID_BACK: 'Pièce d’identité, verso',
  SELFIE: 'Selfie avec la pièce',
  PORTFOLIO: 'Réalisation',
};

// Actions du journal d'audit, en clair
const ACTIONS: Record<string, string> = {
  VERIFICATION_APPROVED: 'Profil validé',
  VERIFICATION_REJECTED: 'Dossier refusé',
  ACCOUNT_SUSPENDED: 'Compte suspendu',
  ACCOUNT_REACTIVATED: 'Compte réactivé',
  NOTE: 'Note interne',
  TRADE_CREATED: 'Métier ajouté',
  TRADE_UPDATED: 'Métier modifié',
  STAFF_INVITED: 'Membre invité',
  STAFF_ROLE_CHANGED: 'Rôle changé',
  STAFF_SUSPENDED: 'Membre suspendu',
  STAFF_REACTIVATED: 'Membre réactivé',
  STAFF_ACCESS_RESET: 'Accès réinitialisés',
  STAFF_LOCKED: 'Compte verrouillé',
  STAFF_LOGIN: 'Connexion',
  STAFF_PASSWORD_CHANGED: 'Mot de passe changé',
};

const TABLES = { request: REQUEST, provider: PROVIDER, account: ACCOUNT, mission: MISSION, proposal: PROPOSAL };
export type BadgeKind = keyof typeof TABLES;

export function badge(kind: BadgeKind, status: string | null | undefined): Badge {
  return (status && TABLES[kind][status]) || { label: status ?? '—', tone: '' };
}

@Pipe({ name: 'badge' })
export class BadgePipe implements PipeTransform {
  transform(status: string | null | undefined, kind: BadgeKind): Badge {
    return badge(kind, status);
  }
}

@Pipe({ name: 'action' })
export class ActionPipe implements PipeTransform {
  transform(action: string): string {
    return ACTIONS[action] ?? action;
  }
}
