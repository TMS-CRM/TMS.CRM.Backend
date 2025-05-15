import { randomUUID } from 'crypto';
import { type TaskDatabase } from '../../models/entities/task.js';

export class TaskDatabaseBuilder {
  private taskDatabaseBuilder: Partial<TaskDatabase>;

  private constructor() {
    this.taskDatabaseBuilder = {
      external_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withTenantId(value: number): this {
    this.taskDatabaseBuilder.tenant_id = value;
    return this;
  }

  withDescription(value: string): this {
    this.taskDatabaseBuilder.description = value;
    return this;
  }

  withDueDate(value: string): this {
    this.taskDatabaseBuilder.due_date = value;
    return this;
  }

  withCompleted(value: boolean): this {
    this.taskDatabaseBuilder.completed = value;
    return this;
  }

  build(): Partial<TaskDatabase> {
    return this.taskDatabaseBuilder;
  }

  static make(): TaskDatabaseBuilder {
    return new TaskDatabaseBuilder();
  }
}
