import { randomUUID } from 'crypto';
import type { CustomerDatabase } from '../../models/entities/customer.js';

export class CustomerDatabaseBuilder {
  private customerDatabaseBuilder: Partial<CustomerDatabase>;

  private constructor() {
    this.customerDatabaseBuilder = {
      external_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.customerDatabaseBuilder.tenant_id = value;
    return this;
  }

  withFirstName(value: string): this {
    this.customerDatabaseBuilder.first_name = value;
    return this;
  }

  withLastName(value: string): this {
    this.customerDatabaseBuilder.last_name = value;
    return this;
  }

  withEmail(value: string): this {
    this.customerDatabaseBuilder.email = value;
    return this;
  }

  withPhone(value: string): this {
    this.customerDatabaseBuilder.phone = value;
    return this;
  }

  withStreet(value: string): this {
    this.customerDatabaseBuilder.street = value;
    return this;
  }

  withCity(value: string): this {
    this.customerDatabaseBuilder.city = value;
    return this;
  }

  withState(value: string): this {
    this.customerDatabaseBuilder.state = value;
    return this;
  }

  withZipCode(value: string): this {
    this.customerDatabaseBuilder.zip_code = value;
    return this;
  }

  withCustomerImageUrl(value: string): this {
    this.customerDatabaseBuilder.image_url = value;
    return this;
  }

  build(): Partial<CustomerDatabase> {
    return this.customerDatabaseBuilder;
  }

  static make(): CustomerDatabaseBuilder {
    return new CustomerDatabaseBuilder();
  }
}
