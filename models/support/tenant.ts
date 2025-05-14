import type { PublicTenant } from '../api/payloads/tenant.js';
import type { PublicUser } from '../api/payloads/user.js';

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
