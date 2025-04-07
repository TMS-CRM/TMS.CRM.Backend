import type { PaginatedResponse } from '../responses/pagination.js';

/** The exposed User object */
export interface PublicUser {
  uuid: string; // Only exposes the uuid
  firstName: string;
  lastName: string;
  email: string;
  createdOn: string;
  modifiedOn: string | null;
}

// POST user payload schema
export const postUserRequestSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
  },
  required: ['firstName', 'lastName', 'email'],
  additionalProperties: false,
};

// PUT user payload schema
export const putUserRequestSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
  },
  required: ['firstName', 'lastName', 'email'],
  additionalProperties: false,
};

// POST user payloads
export interface PostUserRequestPayload extends Pick<PublicUser, 'firstName' | 'lastName' | 'email'> {}

export type PostUserResponsePayload = PublicUser;

// PUT user payloads
export interface PutUserRequestPayload extends Pick<PublicUser, 'firstName' | 'lastName' | 'email'> {}

export type PutUserResponsePayload = PublicUser;

// GET user payloads
export type GetUserResponsePayload = PublicUser;

// GET user list payloads
export type GetUserListResponsePayload = PaginatedResponse<PublicUser>;

export interface GetUserListFilter {
  limit: number;
  offset: number;
  tenantId: number; // TODO: Remove once the tenant is pulled from the token
}
