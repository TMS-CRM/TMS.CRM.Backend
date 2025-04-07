import { randomUUID } from 'crypto';
import type { integer } from 'aws-sdk/clients/cloudfront.js';
import type { text } from 'aws-sdk/clients/customerprofiles.js';
import type { DealProgress, IDealEntry, RoomAccess } from '../../models/database/dealEntry.js';

export class DealEntryBuilder {
  private dealEntry: Partial<IDealEntry>;

  private constructor() {
    this.dealEntry = {
      ExternalUuid: randomUUID(),
      CreatedOn: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.dealEntry.TenantId = value;
    return this;
  }

  withCustomerId(value: number): this {
    this.dealEntry.CustomerId = value;
    return this;
  }

  withStreet(value: text): this {
    this.dealEntry.Street = value;
    return this;
  }

  withCity(value: text): this {
    this.dealEntry.City = value;
    return this;
  }

  withState(value: text): this {
    this.dealEntry.State = value;
    return this;
  }

  withZipCode(value: text): this {
    this.dealEntry.ZipCode = value;
    return this;
  }

  withRoomArea(value: number): this {
    this.dealEntry.RoomArea = value;
    return this;
  }

  withPrice(value: number): this {
    this.dealEntry.Price = value;
    return this;
  }

  withNumberOfPeople(value: integer): this {
    this.dealEntry.NumberOfPeople = value;
    return this;
  }

  withAppointmentDate(value: string): this {
    this.dealEntry.AppointmentDate = value;
    return this;
  }

  withProgress(value: DealProgress): this {
    this.dealEntry.Progress = value;
    return this;
  }

  withSpecialInstructions(value: string): this {
    this.dealEntry.SpecialInstructions = value;
    return this;
  }

  withRoomAccess(value: RoomAccess): this {
    this.dealEntry.RoomAccess = value;
    return this;
  }

  withDealImageUrl(value: string): this {
    this.dealEntry.ImageUrl = value;
    return this;
  }

  build(): Partial<IDealEntry> {
    return this.dealEntry;
  }

  static make(): DealEntryBuilder {
    return new DealEntryBuilder();
  }
}

export class ExtendedDealEntry {}
