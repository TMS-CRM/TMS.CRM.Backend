export interface UserTenantEntry {
  Id: number;
  UserId: number;
  TenantId: number;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}
