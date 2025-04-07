import { randomUUID } from 'crypto';
import type { IActivityEntry } from '../../models/database/activityEntry.js';

export class ActivityEntryBuilder {
  private activityEntry: Partial<IActivityEntry>;

  private constructor() {
    this.activityEntry = {
      ExternalUuid: randomUUID(),
      CreatedOn: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.activityEntry.TenantId = value;
    return this;
  }

  withDealId(value: number): this {
    this.activityEntry.DealId = value;
    return this;
  }

  withDescription(value: string): this {
    this.activityEntry.Description = value;
    return this;
  }

  withDate(value: string): this {
    this.activityEntry.Date = value;
    return this;
  }

  withImageUrl(value: string): this {
    this.activityEntry.ImageUrl = value;
    return this;
  }

  build(): Partial<IActivityEntry> {
    return this.activityEntry;
  }

  static make(): ActivityEntryBuilder {
    return new ActivityEntryBuilder();
  }
}
