import type { PublicUser } from '../api/payloads/user.js';
import type { PublicTenant } from '../entities/tenantEntry.js';

export interface CreateTenantRequestPayload {
  name: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export type CreateTenantResultKeys = {
  newTenantId: number;
  newUserId: number;
};

export type CreateTenantResponsePayload = {
  tenant: PublicTenant;
  user: PublicUser;
};
