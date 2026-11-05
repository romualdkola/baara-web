// Réponses de l'API v2 (/api/v2/admin et /api/v2/auth/staff), telles que les renvoie TrustLinkApi.

export type StaffRole = 'SUPER_ADMIN' | 'MODERATOR' | 'SUPPORT';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';
export type VerificationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StaffView {
  id: number;
  email: string;
  fullName: string;
  role: StaffRole;
  status: AccountStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StaffChallenge {
  challengeToken: string;
  enrollment: { secret: string; otpauthUri: string } | null;
}

export interface StaffSession {
  tokens: TokenPair;
  staff: StaffView;
}

export interface TradeRef {
  id: number;
  label: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  targetType: string;
  targetId: number;
  note: string | null;
  staffName: string | null;
  createdAt: string;
}

// --- Vérifications -----------------------------------------------------------------------

export interface QueueItem {
  id: number;
  status: VerificationStatus;
  accountId: number;
  fullName: string | null;
  phone: string;
  businessId: number;
  businessName: string;
  trades: string | null;
  radiusKm: number;
  documentCount: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  reason: string | null;
}

export interface ReviewDetail {
  id: number;
  status: VerificationStatus;
  reason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  accountId: number;
  fullName: string | null;
  phone: string;
  accountStatus: AccountStatus;
  accountCreatedAt: string;
  businessId: number;
  businessName: string;
  description: string | null;
  yearsExperience: number | null;
  radiusKm: number;
  trades: TradeRef[];
  documents: { id: number; type: string }[];
  previous: { id: number; status: VerificationStatus; reason: string | null; submittedAt: string | null; reviewedAt: string | null }[];
  history: AuditEntry[];
}

// --- Prestataires et clients ---------------------------------------------------------------

export type ProviderStatusFilter = 'VERIFIED' | 'PENDING' | 'SUSPENDED';

export interface ProviderRow {
  businessId: number;
  accountId: number;
  fullName: string | null;
  phone: string;
  businessName: string;
  trades: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  completedMissions: number;
  status: string;
  createdAt: string;
  lastActivityAt: string | null;
}

export interface MemberView {
  accountId: number;
  fullName: string | null;
  phone: string;
  role: 'MANAGER' | 'ARTISAN';
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
}

export interface ProviderDetail {
  businessId: number;
  businessName: string;
  description: string | null;
  yearsExperience: number | null;
  radiusKm: number;
  available: boolean;
  trades: TradeRef[];
  createdAt: string;
  status: string;
  manager: MemberView | null;
  members: MemberView[];
  stats: {
    ratingAvg: number | null;
    ratingCount: number;
    completedMissions: number;
    cancelledMissions: number;
    volumePaidFcfa: number;
    pendingProposals: number;
  };
  missions: {
    missionId: number;
    requestId: number;
    ref: string;
    title: string;
    clientName: string | null;
    district: string;
    scheduledAt: string | null;
    priceFcfa: number | null;
    status: string;
  }[];
  reviews: { rating: number; comment: string | null; tags: string | null; clientName: string | null; createdAt: string }[];
  history: AuditEntry[];
}

export interface ClientRow {
  id: number;
  fullName: string | null;
  phone: string;
  status: AccountStatus;
  provider: boolean;
  requestCount: number;
  lastRequestAt: string | null;
  createdAt: string;
}

export interface ClientDetail {
  id: number;
  fullName: string | null;
  phone: string;
  status: AccountStatus;
  provider: boolean;
  businessId: number | null;
  createdAt: string;
  stats: { requests: number; open: number; done: number; cancelled: number; volumePaidFcfa: number; reviewsGiven: number };
  requests: RequestRow[];
  history: AuditEntry[];
}

export interface AccountState {
  id: number;
  fullName: string | null;
  status: AccountStatus;
}

// --- Activité -------------------------------------------------------------------------------

export type Stage = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'DISPUTED';
export type Period = 'TODAY' | 'WEEK' | 'MONTH';

export interface RequestRow {
  id: number;
  ref: string;
  title: string;
  trade: string;
  district: string;
  status: string;
  urgent: boolean;
  amountFcfa: number | null;
  proposalCount: number;
  clientId: number;
  clientName: string | null;
  businessId: number | null;
  businessName: string | null;
  createdAt: string;
}

export interface Dashboard {
  period: Period;
  since: string;
  kpis: {
    requestsPublished: number;
    requestsWithoutOffer: number;
    missionsCompleted: number;
    averageRating: number | null;
    volumePaidFcfa: number;
    newAccounts: number;
    newProviders: number;
  };
  todo: { pendingVerifications: number; oldestPendingSince: string | null; staleRequests: number };
  recentRequests: RequestRow[];
}

export interface BusinessCard {
  id: number;
  displayName: string;
  ratingAvg: number | null;
  ratingCount: number;
  completedMissions: number;
  verified: boolean;
}

export interface ProposalView {
  id: number;
  business: BusinessCard;
  priceFcfa: number;
  partsIncluded: boolean;
  proposedAt: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

export interface MissionView {
  id: number;
  status: string;
  priceFcfa: number | null;
  business: BusinessCard;
  artisanName: string | null;
  scheduledAt: string | null;
  enRouteAt: string | null;
  onSiteAt: string | null;
  startedAt: string | null;
  doneAt: string | null;
  confirmedAt: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  reviewed: boolean;
}

export interface AdminRequestDetail {
  ref: string;
  client: { id: number; fullName: string | null; phone: string; status: AccountStatus };
  request: {
    id: number;
    title: string;
    description: string | null;
    trade: TradeRef;
    district: string;
    address: string | null;
    preferredDate: string | null;
    timeSlot: string;
    budgetFcfa: number | null;
    urgent: boolean;
    mode: string;
    status: string;
    cancellationReason: string | null;
    createdAt: string;
    proposals: ProposalView[];
    mission: MissionView | null;
  };
}

// --- Configuration ---------------------------------------------------------------------------

export interface TradeRow {
  id: number;
  family: string;
  label: string;
  active: boolean;
  sortOrder: number;
  providerCount: number;
  requestCount: number;
}

export interface TemporaryPassword {
  accountId: number;
  temporaryPassword: string;
}

export interface Invited {
  staff: StaffView;
  temporaryPassword: string;
}
