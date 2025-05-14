import type { PostCustomerRequestPayload, PublicCustomer, PutCustomerRequestPayload } from '../api/payloads/customer.js';

export interface ICustomerEntry {
  Id: number;
  ExternalUuid: string;
  TenantId: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Street: string;
  City: string;
  State: string;
  ZipCode: string;
  ImageUrl: string;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}

export class CustomerEntry implements ICustomerEntry {
  public Id: number;
  public ExternalUuid: string;
  public TenantId: number;
  public FirstName: string;
  public LastName: string;
  public Email: string;
  public Phone: string;
  public Street: string;
  public City: string;
  public State: string;
  public ZipCode: string;
  public ImageUrl: string;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: ICustomerEntry) {
    this.Id = data.Id;
    this.ExternalUuid = data.ExternalUuid;
    this.TenantId = data.TenantId;
    this.FirstName = data.FirstName;
    this.LastName = data.LastName;
    this.Email = data.Email;
    this.Phone = data.Phone;
    this.Street = data.Street;
    this.City = data.City;
    this.State = data.State;
    this.ZipCode = data.ZipCode;
    this.ImageUrl = data.ImageUrl;
    this.CreatedOn = data.CreatedOn;
    this.ModifiedOn = data.ModifiedOn;
    this.DeletedOn = data.DeletedOn;
  }

  /** Convert the PostCustomerRequestPayload to a Partial<CustomerEntry> */
  public static fromPostRequestPayload(tenantId: number, payload: PostCustomerRequestPayload): Partial<CustomerEntry> {
    return {
      TenantId: tenantId,
      FirstName: payload.firstName,
      LastName: payload.lastName,
      Email: payload.email,
      Phone: payload.phone,
      Street: payload.street,
      City: payload.city,
      State: payload.state,
      ZipCode: payload.zipCode,
      ImageUrl: payload.imageUrl,
    };
  }

  /** Convert the PutCustomerRequestPayload to a Partial<CustomerEntry> */
  public static fromPutRequestPayload(payload: PutCustomerRequestPayload): Partial<CustomerEntry> {
    return {
      FirstName: payload.firstName,
      LastName: payload.lastName,
      Email: payload.email,
      Phone: payload.phone,
      Street: payload.street,
      City: payload.city,
      State: payload.state,
      ZipCode: payload.zipCode,
      ImageUrl: payload.imageUrl,
      ModifiedOn: new Date().toISOString(),
    };
  }

  /** Convert the CustomerEntry to a PublicCustomer */
  public toPublic(): PublicCustomer {
    return {
      uuid: this.ExternalUuid,
      firstName: this.FirstName,
      lastName: this.LastName,
      email: this.Email,
      phone: this.Phone,
      street: this.Street,
      city: this.City,
      state: this.State,
      zipCode: this.ZipCode,
      imageUrl: this.ImageUrl,
      createdOn: this.CreatedOn,
      modifiedOn: this.ModifiedOn ?? null,
      deletedOn: this.DeletedOn ?? null,
    };
  }
}
