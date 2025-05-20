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
  public userId: number;
  public tenantId: number;
  public createdOn: string;
  public modifiedOn: string | null;
  public deletedOn: string | null;

  public constructor(data: UserTenantDatabase) {
    this.id = data.id;
    this.userId = data.user_id;
    this.tenantId = data.tenant_id;
    this.createdOn = data.created_on;
    this.modifiedOn = data.modified_on;
    this.deletedOn = data.deleted_on;
  }

  public static create(userId: number, tenantId: number): Partial<UserTenantDatabase> {
    return {
      user_id: userId,
      tenant_id: tenantId,
      created_on: new Date().toISOString(),
    };
  }
}
