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
export interface DealDatabase {
  id: number;
  external_uuid: string;
  tenant_id: number;
  customer_id: number;
  image_url: string;
  street: text;
  city: text;
  state: text;
  zip_code: text;
  room_area: number;
  price: number;
  number_of_people: integer;
  appointment_date: string;
  progress: DealProgress;
  special_instructions: string;
  room_access: RoomAccess;
  created_on: string;
  modified_on: string | null;
  deleted_on: string | null;
}

//Deal entry with customer information
export interface ExtendedDealDatabase extends DealDatabase {
  customer_external_uuid: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  customer_image_url: string;
}

export class Deal {
  public id: number;
  public externalUuid: string;
  public tenantId: number;
  public customer: Pick<CustomerEntry, 'ExternalUuid' | 'Id' | 'FirstName' | 'LastName' | 'Email' | 'Phone' | 'ImageUrl'>;
  public imageUrl: string;
  public street: string;
  public city: string;
  public state: string;
  public zipCode: string;
  public roomArea: number;
  public price: number;
  public numberOfPeople: number;
  public appointmentDate: string;
  public progress: DealProgress;
  public specialInstructions: string;
  public roomAccess: RoomAccess;
  public createdOn: string;
  public modifiedOn: string | null;
  public deletedOn: string | null;

  public constructor(data: ExtendedDealDatabase) {
    this.id = data.id;
    this.externalUuid = data.external_uuid;
    this.tenantId = data.tenant_id;
    this.customer = {
      Id: data.customer_id,
      ExternalUuid: data.customer_external_uuid,
      FirstName: data.customer_first_name,
      ImageUrl: data.customer_image_url,
      LastName: data.customer_last_name,
      Email: data.customer_email,
      Phone: data.customer_phone,
    };
    this.imageUrl = data.image_url;
    this.street = data.street;
    this.city = data.city;
    this.state = data.state;
    this.zipCode = data.zip_code;
    this.roomArea = data.room_area;
    this.price = data.price;
    this.numberOfPeople = data.number_of_people;
    this.appointmentDate = data.appointment_date;
    this.progress = data.progress;
    this.specialInstructions = data.special_instructions;
    this.roomAccess = data.room_access;
    this.createdOn = data.created_on;
    this.modifiedOn = data.modified_on;
    this.deletedOn = data.deleted_on;
  }

  /** Convert the PostDealRequestPayload to a Partial<DealEntry> */
  public static create(tenantId: number, customerId: number, payload: PostDealRequestPayload): Partial<DealDatabase> {
    return {
      tenant_id: tenantId,
      customer_id: customerId,
      image_url: payload.imageUrl,
      street: payload.street,
      city: payload.city,
      state: payload.state,
      zip_code: payload.zipCode,
      room_area: payload.roomArea,
      price: payload.price,
      number_of_people: payload.numberOfPeople,
      appointment_date: payload.appointmentDate,
      progress: payload.progress,
      special_instructions: payload.specialInstructions,
      room_access: payload.roomAccess,
    };
  }

  /** Convert the PutDealRequestPayload to a Partial<DealDatabase> */
  public static update(payload: PutDealRequestPayload): Partial<DealDatabase> {
    return {
      image_url: payload.imageUrl,
      street: payload.street,
      city: payload.city,
      state: payload.state,
      zip_code: payload.zipCode,
      room_area: payload.roomArea,
      price: payload.price,
      number_of_people: payload.numberOfPeople,
      appointment_date: payload.appointmentDate,
      progress: payload.progress,
      special_instructions: payload.specialInstructions,
      room_access: payload.roomAccess,
      modified_on: new Date().toISOString(),
    };
  }

  /** Convert the ExtendedDealEntry to a PublicDeal */
  public toPublic(): PublicDeal {
    return {
      uuid: this.externalUuid,
      customer: {
        uuid: this.customer.ExternalUuid,
        imageUrl: this.customer.ImageUrl ?? null,
        firstName: this.customer.FirstName,
        lastName: this.customer.LastName,
        email: this.customer.Email,
        phone: this.customer.Phone,
      },
      price: this.price,
      street: this.street,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
      imageUrl: this.imageUrl,
      roomArea: this.roomArea,
      numberOfPeople: this.numberOfPeople,
      appointmentDate: this.appointmentDate,
      progress: this.progress,
      specialInstructions: this.specialInstructions,
      roomAccess: this.roomAccess,
      createdOn: this.createdOn,
      modifiedOn: this.modifiedOn ?? null,
      deletedOn: this.deletedOn ?? null,
    };
  }
}
