import { randomUUID } from 'crypto';
import { type TaskDatabase } from '../../models/entities/task.js';

export class TaskDatabaseBuilder {
  private taskDatabase: Partial<TaskDatabase>;

  private constructor() {
    this.taskDatabase = {
      external_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.taskDatabase.tenant_id = value;
    return this;
  }

  withDescription(value: string): this {
    this.taskDatabase.description = value;
    return this;
  }

  withDueDate(value: string): this {
    this.taskDatabase.due_date = value;
    return this;
  }

  withCompleted(value: boolean): this {
    this.taskDatabase.completed = value;
    return this;
  }

  build(): Partial<TaskDatabase> {
    return this.taskDatabase;
  }

  static make(): TaskDatabaseBuilder {
    return new TaskDatabaseBuilder();
  }
}
