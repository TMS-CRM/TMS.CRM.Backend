import type { UserTenantEntry } from '../../models/entities/userTenantEntry.js';

export class UserTenantEntryBuilder {
  private userTenantEntry: UserTenantEntry;

  private constructor() {
    this.userTenantEntry = {
      UserId: 0,
      TenantId: 0,
    } as unknown as UserTenantEntry;
  }

  withUserId(value: number): this {
    this.userTenantEntry.UserId = value;
    return this;
  }

  withTenantId(value: number): this {
    this.userTenantEntry.TenantId = value;
    return this;
  }

  build(): UserTenantEntry {
    return this.userTenantEntry;
  }

  static make(): UserTenantEntryBuilder {
    return new UserTenantEntryBuilder();
  }
}
