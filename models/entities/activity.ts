import type { DealEntry } from './dealEntry.js';
import type { PostActivityRequestPayload, PublicActivity, PutActivityRequestPayload } from '../api/payloads/activity.js';

export interface ActivityDatabase {
  id: number;
  external_uuid: string;
  tenant_id: number;
  deal_id: number;
  description: string;
  date: string;
  image_url: string;
  created_on: string;
  modified_on: string | null;
  deleted_on: string | null;
}

/** ActivityEntry with Deal information */
export interface ExtendedActivityDatabase extends ActivityDatabase {
  deal_external_uuid: string;
}

export class Activity {
  public id: number;
  public externalUuid: string;
  public tenantId: number;
  public deal: Pick<DealEntry, 'Id' | 'ExternalUuid'>;
  public description: string;
  public date: string;
  public imageUrl: string;
  public createdOn: string;
  public modifiedOn: string | null;
  public deletedOn: string | null;

  public constructor(data: ExtendedActivityDatabase) {
    this.id = data.id;
    this.externalUuid = data.external_uuid;
    this.tenantId = data.tenant_id;
    this.deal = { Id: data.deal_id, ExternalUuid: data.deal_external_uuid };
    this.description = data.description;
    this.date = data.date;
    this.imageUrl = data.image_url;
    this.createdOn = data.created_on;
    this.modifiedOn = data.modified_on;
    this.deletedOn = data.deleted_on;
  }

  /** Convert the PostActivityRequestPayload to a Partial<ActivityEntry> */
  public static create(tenantId: number, dealId: number, payload: PostActivityRequestPayload): Partial<ActivityDatabase> {
    return {
      tenant_id: tenantId,
      deal_id: dealId,
      description: payload.description,
      date: payload.date,
      image_url: payload.imageUrl,
    };
  }

  /** Convert the PutActivityRequestPayload to a Partial<ActivityEntry> */
  public static update(payload: PutActivityRequestPayload): Partial<ActivityDatabase> {
    return {
      description: payload.description,
      date: payload.date,
      image_url: payload.imageUrl,
      modified_on: new Date().toISOString(),
    };
  }

  /** Convert the Activity to a PublicActivity */
  public toPublic(): PublicActivity {
    return {
      uuid: this.externalUuid,
      dealUuid: this.deal.ExternalUuid,
      description: this.description,
      date: this.date,
      imageUrl: this.imageUrl,
      createdOn: this.createdOn,
      modifiedOn: this.modifiedOn ?? null,
      deletedOn: this.deletedOn ?? null,
    };
  }
}
