import { randomUUID } from 'crypto';
import type { ITaskEntry } from '../../models/database/taskEntry.js';

export class TaskEntryBuilder {
  private taskEntry: Partial<ITaskEntry>;

  private constructor() {
    this.taskEntry = {
      ExternalUuid: randomUUID(),
      CreatedOn: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.taskEntry.TenantId = value;
    return this;
  }

  withDescription(value: string): this {
    this.taskEntry.Description = value;
    return this;
  }

  withDueDate(value: string): this {
    this.taskEntry.DueDate = value;
    return this;
  }

  withCompleted(value: boolean): this {
    this.taskEntry.Completed = value;
    return this;
  }

  build(): Partial<ITaskEntry> {
    return this.taskEntry;
  }

  static make(): TaskEntryBuilder {
    return new TaskEntryBuilder();
  }
}
