import type { PaginatedResponse } from '../responses/pagination.js';

/** The exposed Task object */
export interface PublicTask {
  uuid: string; // Only exposes the uuid
  description: string;
  dueDate: string;
  completed: boolean;
  createdOn: string;
  modifiedOn: string | null;
  deletedOn: string | null;
}

// POST task payload schema
export const postTaskRequestSchema = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    dueDate: { type: 'string', format: 'date-time' },
    completed: { type: 'boolean', nullable: true },
  },
  required: ['description', 'dueDate'],
  additionalProperties: false,
};

// PUT task payload schema
export const putTaskRequestSchema = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    dueDate: { type: 'string', format: 'date-time' },
    completed: { type: 'boolean' },
  },
  required: ['description', 'dueDate', 'completed'],
  additionalProperties: false,
};

// POST task payloads
export interface PostTaskRequestPayload extends Omit<PublicTask, 'uuid' | 'createdOn' | 'modifiedOn' | 'deletedOn'> {}

export type PostTaskResponsePayload = PublicTask;

// PUT task payloads
export interface PutTaskRequestPayload extends Omit<PublicTask, 'uuid' | 'createdOn' | 'modifiedOn' | 'deletedOn'> {}

export type PutTaskResponsePayload = PublicTask;

// GET task payloads
export type GetTaskResponsePayload = PublicTask;

// GET task list payloads
export type GetTaskListResponsePayload = PaginatedResponse<PublicTask>;

export interface GetTaskListFilter {
  limit: number;
  offset: number;
  tenantId: number; // TODO: Remove once the tenant is pulled from the token
}
