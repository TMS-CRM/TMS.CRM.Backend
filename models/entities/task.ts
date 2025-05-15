import type { PostTaskRequestPayload, PublicTask, PutTaskRequestPayload } from '../api/payloads/task.js';

export interface TaskDatabase {
  id: number;
  external_uuid: string;
  tenant_id: number;
  description: string;
  due_date: string;
  completed: boolean;
  created_on: string;
  modified_on: string | null;
  deleted_on: string | null;
}

export class Task {
  public id: number;
  public externalUuid: string;
  public tenantId: number;
  public description: string;
  public dueDate: string;
  public completed: boolean;
  public createdOn: string;
  public modifiedOn: string | null;
  public deletedOn: string | null;

  public constructor(data: TaskDatabase) {
    this.id = data.id;
    this.externalUuid = data.external_uuid;
    this.tenantId = data.tenant_id;
    this.description = data.description;
    this.dueDate = data.due_date;
    this.completed = data.completed;
    this.createdOn = data.created_on;
    this.modifiedOn = data.modified_on;
    this.deletedOn = data.deleted_on;
  }

  /** Convert the PostTaskRequestPayload to a Partial<TaskEntry> */
  public static create(tenantId: number, payload: PostTaskRequestPayload): Partial<TaskDatabase> {
    return {
      tenant_id: tenantId,
      description: payload.description,
      due_date: payload.dueDate,
      completed: payload.completed,
    };
  }

  /** Convert the PutTaskRequestPayload to a Partial<TaskEntry> */
  public static update(payload: PutTaskRequestPayload): Partial<TaskDatabase> {
    return {
      description: payload.description,
      due_date: payload.dueDate,
      completed: payload.completed,
      modified_on: new Date().toISOString(),
    };
  }

  /** Convert the Task to a PublicTask */
  public toPublic(): PublicTask {
    return {
      uuid: this.externalUuid,
      description: this.description,
      dueDate: this.dueDate,
      completed: this.completed,
      createdOn: this.createdOn,
      modifiedOn: this.modifiedOn ?? null,
      deletedOn: this.deletedOn ?? null,
    };
  }
}
