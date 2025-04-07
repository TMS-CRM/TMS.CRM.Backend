import type { PaginatedResponse } from '../responses/pagination.js';

/** The exposed Customer object */
export interface PublicCustomer {
  uuid: string; // Only exposes the uuid
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  imageUrl: string;
  createdOn: string;
  modifiedOn: string | null;
  deletedOn: string | null;
}

// POST customer payload schema
export const postCustomerRequestSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    street: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    zipCode: { type: 'string' },
    imageUrl: { type: 'string', nullable: true },
  },
  required: ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'zipCode'],
  additionalProperties: false,
};

export const putCustomerRequestSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    street: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    zipCode: { type: 'string' },
    imageUrl: { type: 'string', nullable: true },
  },
  required: ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'zipCode'],
  additionalProperties: false,
};

// POST customer payloads
export interface PostCustomerRequestPayload extends Omit<PublicCustomer, 'uuid' | 'createdOn' | 'modifiedOn' | 'deletedOn'> {}

export type PostCustomerResponsePayload = PublicCustomer;

// PUT customer payloads
export interface PutCustomerRequestPayload extends Omit<PublicCustomer, 'uuid' | 'createdOn' | 'modifiedOn' | 'deletedOn'> {}

export type PutCustomerResponsePayload = PublicCustomer;

// GET customer payloads
export type GetCustomerResponsePayload = PublicCustomer;

// GET customer list payloads
export type GetCustomerListResponsePayload = PaginatedResponse<PublicCustomer>;

export interface GetCustomerListFilter {
  limit: number;
  offset: number;
  tenantId: number; // TODO: Remove once the tenant is pulled from the token
}
