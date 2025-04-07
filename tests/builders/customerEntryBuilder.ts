import { randomUUID } from 'crypto';
import type { ICustomerEntry } from '../../models/database/customerEntry.js';

export class CustomerEntryBuilder {
  private customerEntry: Partial<ICustomerEntry>;

  private constructor() {
    this.customerEntry = {
      ExternalUuid: randomUUID(),
      CreatedOn: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.customerEntry.TenantId = value;
    return this;
  }

  withFirstName(value: string): this {
    this.customerEntry.FirstName = value;
    return this;
  }

  withLastName(value: string): this {
    this.customerEntry.LastName = value;
    return this;
  }

  withEmail(value: string): this {
    this.customerEntry.Email = value;
    return this;
  }

  withPhone(value: string): this {
    this.customerEntry.Phone = value;
    return this;
  }

  withStreet(value: string): this {
    this.customerEntry.Street = value;
    return this;
  }

  withCity(value: string): this {
    this.customerEntry.City = value;
    return this;
  }

  withState(value: string): this {
    this.customerEntry.State = value;
    return this;
  }

  withZipCode(value: string): this {
    this.customerEntry.ZipCode = value;
    return this;
  }

  withCustomerImageUrl(value: string): this {
    this.customerEntry.ImageUrl = value;
    return this;
  }

  build(): Partial<ICustomerEntry> {
    return this.customerEntry;
  }

  static make(): CustomerEntryBuilder {
    return new CustomerEntryBuilder();
  }
}
