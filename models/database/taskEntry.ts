import type { PostTaskRequestPayload, PublicTask, PutTaskRequestPayload } from '../api/payloads/task.js';

export interface ITaskEntry {
  Id: number;
  ExternalUuid: string;
  TenantId: number;
  Description: string;
  DueDate: string;
  Completed: boolean;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}

export class TaskEntry implements ITaskEntry {
  public Id: number;
  public ExternalUuid: string;
  public TenantId: number;
  public Description: string;
  public DueDate: string;
  public Completed: boolean;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: ITaskEntry) {
    this.Id = data.Id;
    this.ExternalUuid = data.ExternalUuid;
    this.TenantId = data.TenantId;
    this.Description = data.Description;
    this.DueDate = data.DueDate;
    this.Completed = data.Completed;
    this.CreatedOn = data.CreatedOn;
    this.ModifiedOn = data.ModifiedOn;
    this.DeletedOn = data.DeletedOn;
  }

  /** Convert the PostTaskRequestPayload to a Partial<TaskEntry> */
  public static fromPostRequestPayload(tenantId: number, payload: PostTaskRequestPayload): Partial<TaskEntry> {
    return {
      TenantId: tenantId,
      Description: payload.description,
      DueDate: payload.dueDate,
      Completed: payload.completed,
    };
  }

  /** Convert the PutTaskRequestPayload to a Partial<TaskEntry> */
  public static fromPutRequestPayload(payload: PutTaskRequestPayload): Partial<TaskEntry> {
    return {
      Description: payload.description,
      DueDate: payload.dueDate,
      Completed: payload.completed,
      ModifiedOn: new Date().toISOString(),
    };
  }

  /** Convert the TaskEntry to a PublicTask */
  public toPublic(): PublicTask {
    return {
      uuid: this.ExternalUuid,
      description: this.Description,
      dueDate: this.DueDate,
      completed: this.Completed,
      createdOn: this.CreatedOn,
      modifiedOn: this.ModifiedOn ?? null,
      deletedOn: this.DeletedOn ?? null,
    };
  }
}
