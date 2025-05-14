import type { integer } from 'aws-sdk/clients/cloudfront.js';
import type { text } from 'aws-sdk/clients/customerprofiles.js';
import type { CustomerEntry } from './customerEntry.js';
import type { PostDealRequestPayload, PublicDeal, PutDealRequestPayload } from '../api/payloads/deal.js';

export enum DealProgress {
  InProgress = 'InProgress',
  Pending = 'Pending',
  Closed = 'Closed',
}

export enum RoomAccess {
  KeysWithDoorman = 'KeysWithDoorman',
  KeysInLockbox = 'KeysInLockbox',
  KeysObtained = 'KeysObtained',
  KeysNotRequired = 'KeysNotRequired',
  Other = 'Other',
}

/** Represents the Deal entry in the database */
export interface IDealEntry {
  Id: number;
  ExternalUuid: string;
  TenantId: number;
  CustomerId: number;
  ImageUrl: string;
  Street: text;
  City: text;
  State: text;
  ZipCode: text;
  RoomArea: number;
  Price: number;
  NumberOfPeople: integer;
  AppointmentDate: string;
  Progress: DealProgress;
  SpecialInstructions: string;
  RoomAccess: RoomAccess;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}

export class DealEntry implements IDealEntry {
  public Id: number;
  public ExternalUuid: string;
  public TenantId: number;
  public CustomerId: number;
  public ImageUrl: string;
  public Street: string;
  public City: string;
  public State: string;
  public ZipCode: string;
  public RoomArea: number;
  public Price: number;
  public NumberOfPeople: number;
  public AppointmentDate: string;
  public Progress: DealProgress;
  public SpecialInstructions: string;
  public RoomAccess: RoomAccess;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: IDealEntry) {
    this.Id = data.Id;
    this.ExternalUuid = data.ExternalUuid;
    this.TenantId = data.TenantId;
    this.CustomerId = data.CustomerId;
    this.ImageUrl = data.ImageUrl;
    this.Street = data.Street;
    this.City = data.City;
    this.State = data.State;
    this.ZipCode = data.ZipCode;
    this.RoomArea = data.RoomArea;
    this.Price = data.Price;
    this.NumberOfPeople = data.NumberOfPeople;
    this.AppointmentDate = data.AppointmentDate;
    this.Progress = data.Progress;
    this.SpecialInstructions = data.SpecialInstructions;
    this.RoomAccess = data.RoomAccess;
    this.CreatedOn = data.CreatedOn;
    this.ModifiedOn = data.ModifiedOn;
    this.DeletedOn = data.DeletedOn;
  }

  /** Convert the PostDealRequestPayload to a Partial<DealEntry> */
  public static fromPostRequestPayload(tenantId: number, customerId: number, payload: PostDealRequestPayload): Partial<DealEntry> {
    return {
      TenantId: tenantId,
      CustomerId: customerId,
      Price: payload.price,
      Street: payload.street,
      City: payload.city,
      State: payload.state,
      ZipCode: payload.zipCode,
      ImageUrl: payload.imageUrl,
      RoomArea: payload.roomArea,
      NumberOfPeople: payload.numberOfPeople,
      AppointmentDate: payload.appointmentDate,
      Progress: payload.progress,
      SpecialInstructions: payload.specialInstructions,
      RoomAccess: payload.roomAccess,
    };
  }

  /** Convert the PutDealRequestPayload to a Partial<DealEntry> */
  public static fromPutRequestPayload(payload: PutDealRequestPayload): Partial<DealEntry> {
    return {
      Price: payload.price,
      Street: payload.street,
      City: payload.city,
      State: payload.state,
      ZipCode: payload.zipCode,
      ImageUrl: payload.imageUrl,
      RoomArea: payload.roomArea,
      NumberOfPeople: payload.numberOfPeople,
      AppointmentDate: payload.appointmentDate,
      Progress: payload.progress,
      SpecialInstructions: payload.specialInstructions,
      RoomAccess: payload.roomAccess,
      ModifiedOn: new Date().toISOString(),
    };
  }
}

/** DealEntry with Customer information */
export interface IExtendedDealEntry extends IDealEntry {
  Customer: Pick<CustomerEntry, 'ExternalUuid' | 'FirstName' | 'LastName' | 'Email' | 'Phone' | 'ImageUrl'>;
}

export class ExtendedDealEntry implements IExtendedDealEntry {
  public Id: number;
  public ExternalUuid: string;
  public TenantId: number;
  public CustomerId: number;
  public Customer: Pick<CustomerEntry, 'ExternalUuid' | 'FirstName' | 'LastName' | 'Email' | 'Phone' | 'ImageUrl'>;
  public Price: number;
  public Street: string;
  public City: string;
  public State: string;
  public ZipCode: string;
  public ImageUrl: string;
  public RoomArea: number;
  public NumberOfPeople: number;
  public AppointmentDate: string;
  public Progress: DealProgress;
  public SpecialInstructions: string;
  public RoomAccess: RoomAccess;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: Record<string, unknown>) {
    this.Id = data.Id as number;
    this.ExternalUuid = data.ExternalUuid as string;
    this.TenantId = data.TenantId as number;
    this.CustomerId = data.CustomerId as number;
    this.Customer = {
      ExternalUuid: data.CustomerExternalUuid as string,
      FirstName: data.CustomerFirstName as string,
      LastName: data.CustomerLastName as string,
      Email: data.CustomerEmail as string,
      Phone: data.CustomerPhone as string,
      ImageUrl: data.CustomerImageUrl as string,
    };
    this.Price = data.Price as number;
    this.Street = data.Street as string;
    this.City = data.City as string;
    this.State = data.State as string;
    this.ZipCode = data.ZipCode as string;
    this.ImageUrl = data.ImageUrl as string;
    this.RoomArea = data.RoomArea as number;
    this.NumberOfPeople = data.NumberOfPeople as number;
    this.AppointmentDate = data.AppointmentDate as string;
    this.Progress = data.Progress as DealProgress;
    this.SpecialInstructions = data.SpecialInstructions as string;
    this.RoomAccess = data.RoomAccess as RoomAccess;
    this.CreatedOn = data.CreatedOn as string;
    this.ModifiedOn = data.ModifiedOn as string | null;
    this.DeletedOn = data.DeletedOn as string | null;
  }

  /** Convert the ExtendedDealEntry to a PublicDeal */
  public toPublic(): PublicDeal {
    return {
      uuid: this.ExternalUuid,
      customer: {
        uuid: this.Customer.ExternalUuid,
        imageUrl: this.Customer.ImageUrl ?? null,
        firstName: this.Customer.FirstName,
        lastName: this.Customer.LastName,
        email: this.Customer.Email,
        phone: this.Customer.Phone,
      },
      price: this.Price,
      street: this.Street,
      city: this.City,
      state: this.State,
      zipCode: this.ZipCode,
      imageUrl: this.ImageUrl,
      roomArea: this.RoomArea,
      numberOfPeople: this.NumberOfPeople,
      appointmentDate: this.AppointmentDate,
      progress: this.Progress,
      specialInstructions: this.SpecialInstructions,
      roomAccess: this.RoomAccess,
      createdOn: this.CreatedOn,
      modifiedOn: this.ModifiedOn ?? null,
      deletedOn: this.DeletedOn ?? null,
    };
  }
}
