import type { PublicTenant } from '../api/payloads/tenant.js';

export interface TenantDatabase {
  id: number;
  external_uuid: string;
  name: string;
  created_on: string;
  modified_on: string | null;
  deleted_on: string | null;
}

export class Tenant {
  public id: number;
  public externalUuid: string;
  public name: string;
  public createdOn: string;
  public modifiedOn: string | null;
  public deletedOn: string | null;

  public constructor(data: TenantDatabase) {
    this.id = data.id;
    this.externalUuid = data.external_uuid;
    this.name = data.name;
    this.createdOn = data.created_on;
    this.modifiedOn = data.modified_on;
    this.deletedOn = data.deleted_on;
  }

  /** Create a new Tenant */
  public static create(name: string): Partial<TenantDatabase> {
    return {
      name: name,
    };
  }

  public toPublic(): PublicTenant {
    return {
      uuid: this.externalUuid,
      name: this.name,
      createdOn: this.createdOn,
      modifiedOn: this.modifiedOn ?? null,
    };
  }
}
