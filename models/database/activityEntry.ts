import type { DealEntry } from './dealEntry.js';
import type { PostActivityRequestPayload, PublicActivity, PutActivityRequestPayload } from '../api/payloads/activity.js';

export interface IActivityEntry {
  Id: number;
  ExternalUuid: string;
  TenantId: number;
  DealId: number;
  Description: string;
  Date: string;
  ImageUrl: string;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}

export class ActivityEntry implements IActivityEntry {
  public Id: number;
  public ExternalUuid: string;
  public TenantId: number;
  public DealId: number;
  public Description: string;
  public Date: string;
  public ImageUrl: string;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: IActivityEntry) {
    this.Id = data.Id;
    this.ExternalUuid = data.ExternalUuid;
    this.TenantId = data.TenantId;
    this.DealId = data.DealId;
    this.Description = data.Description;
    this.Date = data.Date;
    this.ImageUrl = data.ImageUrl;
    this.CreatedOn = data.CreatedOn;
    this.ModifiedOn = data.ModifiedOn;
    this.DeletedOn = data.DeletedOn;
  }

  /** Convert the PostActivityRequestPayload to a Partial<ActivityEntry> */
  public static fromPostRequestPayload(tenantId: number, dealId: number, payload: PostActivityRequestPayload): Partial<ActivityEntry> {
    return {
      TenantId: tenantId,
      DealId: dealId,
      Description: payload.description,
      Date: payload.date,
      ImageUrl: payload.imageUrl,
    };
  }

  /** Convert the PutActivityRequestPayload to a Partial<ActivityEntry> */
  public static fromPutRequestPayload(payload: PutActivityRequestPayload): Partial<ActivityEntry> {
    return {
      Description: payload.description,
      Date: payload.date,
      ImageUrl: payload.imageUrl,
      ModifiedOn: new Date().toISOString(),
    };
  }
}

/** Extended ActivityEntry with Deal information */
export interface IExtendedActivityEntry extends IActivityEntry {
  Deal: Pick<DealEntry, 'ExternalUuid'>;
}

export class ExtendedActivityEntry implements IExtendedActivityEntry {
  public Id: number;
  public ExternalUuid: string;
  public TenantId: number;
  public DealId: number;
  public Deal: Pick<DealEntry, 'ExternalUuid'>;
  public Description: string;
  public Date: string;
  public ImageUrl: string;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: Record<string, unknown>) {
    this.Id = data.Id as number;
    this.ExternalUuid = data.ExternalUuid as string;
    this.TenantId = data.TenantId as number;
    this.DealId = data.DealId as number;
    this.Deal = { ExternalUuid: data.DealExternalUuid as string };
    this.Description = data.Description as string;
    this.Date = data.Date as string;
    this.ImageUrl = data.ImageUrl as string;
    this.CreatedOn = data.CreatedOn as string;
    this.ModifiedOn = data.ModifiedOn as string | null;
    this.DeletedOn = data.DeletedOn as string | null;
  }

  /** Convert the ExtendedActivityEntry to a PublicActivity */
  public toPublic(): PublicActivity {
    return {
      uuid: this.ExternalUuid,
      dealUuid: this.Deal.ExternalUuid,
      description: this.Description,
      date: this.Date,
      imageUrl: this.ImageUrl,
      createdOn: this.CreatedOn,
      modifiedOn: this.ModifiedOn ?? null,
      deletedOn: this.DeletedOn ?? null,
    };
  }
}
