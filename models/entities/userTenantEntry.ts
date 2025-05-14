export interface IUserTenantEntry {
  Id: number;
  UserId: number;
  TenantId: number;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}

export class UserTenantEntry implements IUserTenantEntry {
  public Id: number;
  public UserId: number;
  public TenantId: number;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: IUserTenantEntry) {
    this.Id = data.Id;
    this.UserId = data.UserId;
    this.TenantId = data.TenantId;
    this.CreatedOn = data.CreatedOn;
    this.ModifiedOn = data.ModifiedOn;
    this.DeletedOn = data.DeletedOn;
  }

  public static create(userId: number, tenantId: number): Partial<UserTenantEntry> {
    return {
      UserId: userId,
      TenantId: tenantId,
    };
  }
}
