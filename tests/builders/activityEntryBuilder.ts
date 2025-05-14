import { randomUUID } from 'crypto';
import { type ActivityDatabase } from '../../models/entities/activity.js';
export class ActivityDatabaseBuilder {
  private activityDatabase: Partial<ActivityDatabase>;

  private constructor() {
    this.activityDatabase = {
      external_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.activityDatabase.tenant_id = value;
    return this;
  }

  withDealId(value: number): this {
    this.activityDatabase.deal_id = value;
    return this;
  }

  withDescription(value: string): this {
    this.activityDatabase.description = value;
    return this;
  }

  withDate(value: string): this {
    this.activityDatabase.date = value;
    return this;
  }

  withImageUrl(value: string): this {
    this.activityDatabase.image_url = value;
    return this;
  }

  build(): Partial<ActivityDatabase> {
    return this.activityDatabase;
  }

  static make(): ActivityDatabaseBuilder {
    return new ActivityDatabaseBuilder();
  }
}
