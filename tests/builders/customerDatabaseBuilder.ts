import { randomUUID } from 'crypto';
import type { CustomerDatabase } from '../../models/entities/customer.js';

export class CustomerDatabaseBuilder {
  private customerDatabase: Partial<CustomerDatabase>;

  private constructor() {
    this.customerDatabase = {
      external_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.customerDatabase.tenant_id = value;
    return this;
  }

  withFirstName(value: string): this {
    this.customerDatabase.first_name = value;
    return this;
  }

  withLastName(value: string): this {
    this.customerDatabase.last_name = value;
    return this;
  }

  withEmail(value: string): this {
    this.customerDatabase.email = value;
    return this;
  }

  withPhone(value: string): this {
    this.customerDatabase.phone = value;
    return this;
  }

  withStreet(value: string): this {
    this.customerDatabase.street = value;
    return this;
  }

  withCity(value: string): this {
    this.customerDatabase.city = value;
    return this;
  }

  withState(value: string): this {
    this.customerDatabase.state = value;
    return this;
  }

  withZipCode(value: string): this {
    this.customerDatabase.zip_code = value;
    return this;
  }

  withCustomerImageUrl(value: string): this {
    this.customerDatabase.image_url = value;
    return this;
  }

  build(): Partial<CustomerDatabase> {
    return this.customerDatabase;
  }

  static make(): CustomerDatabaseBuilder {
    return new CustomerDatabaseBuilder();
  }
}
