import { randomUUID } from 'crypto';
import type { integer } from 'aws-sdk/clients/cloudfront.js';
import type { text } from 'aws-sdk/clients/customerprofiles.js';
import type { DealDatabase, DealProgress, RoomAccess } from '../../models/entities/deal.js';

export class DealDatabaseBuilder {
  private dealDatabase: Partial<DealDatabase>;

  private constructor() {
    this.dealDatabase = {
      external_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.dealDatabase.tenant_id = value;
    return this;
  }

  withCustomerId(value: number): this {
    this.dealDatabase.customer_id = value;
    return this;
  }

  withStreet(value: text): this {
    this.dealDatabase.street = value;
    return this;
  }

  withCity(value: text): this {
    this.dealDatabase.city = value;
    return this;
  }

  withState(value: text): this {
    this.dealDatabase.state = value;
    return this;
  }

  withZipCode(value: text): this {
    this.dealDatabase.zip_code = value;
    return this;
  }

  withRoomArea(value: number): this {
    this.dealDatabase.room_area = value;
    return this;
  }

  withPrice(value: number): this {
    this.dealDatabase.price = value;
    return this;
  }

  withNumberOfPeople(value: integer): this {
    this.dealDatabase.number_of_people = value;
    return this;
  }

  withAppointmentDate(value: string): this {
    this.dealDatabase.appointment_date = value;
    return this;
  }

  withProgress(value: DealProgress): this {
    this.dealDatabase.progress = value;
    return this;
  }

  withSpecialInstructions(value: string): this {
    this.dealDatabase.special_instructions = value;
    return this;
  }

  withRoomAccess(value: RoomAccess): this {
    this.dealDatabase.room_access = value;
    return this;
  }

  withDealImageUrl(value: string): this {
    this.dealDatabase.image_url = value;
    return this;
  }

  build(): Partial<DealDatabase> {
    return this.dealDatabase;
  }

  static make(): DealDatabaseBuilder {
    return new DealDatabaseBuilder();
  }
}

export class ExtendedDealEntry {}
