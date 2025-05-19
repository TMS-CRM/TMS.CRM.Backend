export interface UserTenantDatabase {
  id: number;
  user_id: number;
  tenant_id: number;
  created_on: string;
  modified_on: string | null;
  deleted_on: string | null;
}

export class UserTenant {
  public id: number;
  public user_id: number;
  public tenant_id: number;
  public created_on: string;
  public modified_on: string | null;
  public deleted_on: string | null;

  public constructor(data: UserTenantDatabase) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.tenant_id = data.tenant_id;
    this.created_on = data.created_on;
    this.modified_on = data.modified_on;
    this.deleted_on = data.deleted_on;
  }

  public static create(userId: number, tenantId: number): Partial<UserTenantDatabase> {
    return {
      user_id: userId,
      tenant_id: tenantId,
    };
  }
}
