import type { PublicTenant } from '../api/payloads/tenant.js';

export interface TenantEntry {
  Id: number;
  ExternalUuid: string;
  Name: string;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}

export class Tenant implements TenantEntry {
  public Id: number;
  public ExternalUuid: string;
  public Name: string;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: TenantEntry) {
    this.Id = data.Id;
    this.ExternalUuid = data.ExternalUuid;
    this.Name = data.Name;
    this.CreatedOn = data.CreatedOn;
    this.ModifiedOn = data.ModifiedOn;
    this.DeletedOn = data.DeletedOn;
  }

  /** Create a new Tenant */
  public static create(name: string): Partial<TenantEntry> {
    return {
      Name: name,
    };
  }

  public toPublic(): PublicTenant {
    return {
      uuid: this.ExternalUuid,
      name: this.Name,
      createdOn: this.CreatedOn,
      modifiedOn: this.ModifiedOn,
    };
  }
}
