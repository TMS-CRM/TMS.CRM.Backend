import type { PostCustomerRequestPayload, PublicCustomer, PutCustomerRequestPayload } from '../api/payloads/customer.js';

export interface CustomerDatabase {
  id: number;
  external_uuid: string;
  tenant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  image_url: string;
  created_on: string;
  modified_on: string | null;
  deleted_on: string | null;
}

export class Customer {
  public id: number;
  public externalUuid: string;
  public tenantId: number;
  public firstName: string;
  public lastName: string;
  public email: string;
  public phone: string;
  public street: string;
  public city: string;
  public state: string;
  public zipCode: string;
  public imageUrl: string;
  public createdOn: string;
  public modifiedOn: string | null;
  public deletedOn: string | null;

  public constructor(data: CustomerDatabase) {
    this.id = data.id;
    this.externalUuid = data.external_uuid;
    this.tenantId = data.tenant_id;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.email = data.email;
    this.phone = data.phone;
    this.street = data.street;
    this.city = data.city;
    this.state = data.state;
    this.zipCode = data.zip_code;
    this.imageUrl = data.image_url;
    this.createdOn = data.created_on;
    this.modifiedOn = data.modified_on;
    this.deletedOn = data.deleted_on;
  }

  /** Convert the PostCustomerRequestPayload to a Partial<Customer> */
  public static create(tenantId: number, payload: PostCustomerRequestPayload): Partial<CustomerDatabase> {
    return {
      tenant_id: tenantId,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      street: payload.street,
      city: payload.city,
      state: payload.state,
      zip_code: payload.zipCode,
      image_url: payload.imageUrl,
    };
  }

  /** Convert the PutCustomerRequestPayload to a Partial<Customer> */
  public static update(payload: PutCustomerRequestPayload): Partial<CustomerDatabase> {
    return {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      street: payload.street,
      city: payload.city,
      state: payload.state,
      zip_code: payload.zipCode,
      image_url: payload.imageUrl,
      modified_on: new Date().toISOString(),
    };
  }

  /** Convert the CustomerDatabase to a PublicCustomer */
  public toPublic(): PublicCustomer {
    return {
      uuid: this.externalUuid,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      street: this.street,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
      imageUrl: this.imageUrl,
      createdOn: this.createdOn,
      modifiedOn: this.modifiedOn ?? null,
      deletedOn: this.deletedOn ?? null,
    };
  }
}
