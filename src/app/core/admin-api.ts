import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AccountState,
  AccountStatus,
  AdminRequestDetail,
  AuditEntry,
  ClientDetail,
  ClientRow,
  Dashboard,
  Invited,
  Period,
  ProviderDetail,
  ProviderRow,
  ProviderStatusFilter,
  QueueItem,
  RequestRow,
  ReviewDetail,
  Stage,
  StaffRole,
  StaffView,
  TemporaryPassword,
  TradeRow,
  VerificationStatus,
} from './models';

/** Paramètres de requête sans les valeurs vides. */
function params(values: Record<string, string | number | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
  }
  return p;
}

/** Routes du back-office (/api/v2/admin), une méthode par écran ou par action. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v2/admin`;

  private get<T>(path: string, query: Record<string, string | number | null | undefined> = {}): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.base + path, { params: params(query) }));
  }

  private post<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.base + path, body));
  }

  private patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(this.base + path, body));
  }

  // Tableau de bord et activité
  dashboard(period: Period) {
    return this.get<Dashboard>('/dashboard', { period });
  }
  requests(filter: { stage?: Stage | null; q?: string; clientId?: number; businessId?: number }) {
    return this.get<RequestRow[]>('/requests', filter);
  }
  request(id: number) {
    return this.get<AdminRequestDetail>(`/requests/${id}`);
  }

  // Vérifications
  verifications(status: VerificationStatus, q: string) {
    return this.get<QueueItem[]>('/verifications', { status, q });
  }
  verification(id: number) {
    return this.get<ReviewDetail>(`/verifications/${id}`);
  }
  approve(id: number) {
    return this.post<ReviewDetail>(`/verifications/${id}/approve`);
  }
  reject(id: number, reason: string) {
    return this.post<ReviewDetail>(`/verifications/${id}/reject`, { reason });
  }

  /** Adresse de lecture d'une pièce (URL signée, valable quelques minutes). */
  async documentUrl(documentId: number): Promise<string> {
    const link = await firstValueFrom(
      this.http.get<{ url: string }>(`${environment.apiUrl}/api/v2/files/${documentId}`),
    );
    return environment.apiUrl + link.url;
  }

  // Prestataires, clients, comptes
  providers(filter: { status?: ProviderStatusFilter | null; tradeId?: number | null; q?: string }) {
    return this.get<ProviderRow[]>('/providers', filter);
  }
  provider(businessId: number) {
    return this.get<ProviderDetail>(`/providers/${businessId}`);
  }
  clients(filter: { status?: AccountStatus | null; q?: string }) {
    return this.get<ClientRow[]>('/clients', filter);
  }
  client(accountId: number) {
    return this.get<ClientDetail>(`/clients/${accountId}`);
  }
  suspend(accountId: number, reason: string) {
    return this.post<AccountState>(`/accounts/${accountId}/suspend`, { reason });
  }
  reactivate(accountId: number, note: string) {
    return this.post<AccountState>(`/accounts/${accountId}/reactivate`, { note: note || null });
  }
  resetPassword(accountId: number) {
    return this.post<TemporaryPassword>(`/accounts/${accountId}/reset-password`, {});
  }
  addNote(accountId: number, note: string) {
    return this.post<AuditEntry>(`/accounts/${accountId}/notes`, { note });
  }

  // Métiers
  trades() {
    return this.get<TradeRow[]>('/trades');
  }
  createTrade(family: string, label: string) {
    return this.post<TradeRow>('/trades', { family, label });
  }
  updateTrade(id: number, changes: Partial<Pick<TradeRow, 'family' | 'label' | 'active' | 'sortOrder'>>) {
    return this.patch<TradeRow>(`/trades/${id}`, changes);
  }

  // Équipe
  staff() {
    return this.get<StaffView[]>('/staff');
  }
  invite(email: string, fullName: string, role: StaffRole) {
    return this.post<Invited>('/staff', { email, fullName, role });
  }
  updateStaff(id: number, changes: { role?: StaffRole; status?: AccountStatus }) {
    return this.patch<StaffView>(`/staff/${id}`, changes);
  }
  resetAccess(id: number) {
    return this.post<Invited>(`/staff/${id}/reset-access`);
  }
}
