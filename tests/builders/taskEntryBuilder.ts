import { randomUUID } from 'crypto';
import type { TaskEntry } from '../../models/database/taskEntry.js';

export class TaskEntryBuilder {
  private taskEntry: TaskEntry;

  private constructor() {
    this.taskEntry = {
      ExternalUuid: randomUUID(),
      CreatedOn: new Date(Date.now() - 86400000), // 24 hrs
    } as any as TaskEntry;
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

  build(): TaskEntry {
    return this.taskEntry;
  }

  static make(): TaskEntryBuilder {
    return new TaskEntryBuilder();
  }
}
