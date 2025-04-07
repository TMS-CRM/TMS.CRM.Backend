import type { integer } from 'aws-sdk/clients/cloudfront.js';
import { DealProgress, RoomAccess } from '../../database/dealEntry.js';
import type { PaginatedResponse } from '../responses/pagination.js';
import type { text } from 'aws-sdk/clients/customerprofiles.js';

/** The exposed Deal object */
export interface PublicDeal {
  uuid: string; // Only exposes the uuid
  customer: {
    uuid: string;
    imageUrl: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  price: number;
  street: text;
  city: text;
  state: text;
  zipCode: text;
  imageUrl: string;
  roomArea: number;
  numberOfPeople: integer;
  appointmentDate: string;
  progress: DealProgress;
  specialInstructions: string;
  roomAccess: RoomAccess;
  createdOn: string;
  modifiedOn: string | null;
  deletedOn: string | null;
}

// POST deal payload schema
export const postDealRequestSchema = {
  type: 'object',
  properties: {
    customerUuid: { type: 'string' },
    price: { type: 'number' },
    street: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    zipCode: { type: 'string' },
    roomArea: { type: 'number' },
    numberOfPeople: { type: 'number' },
    appointmentDate: { type: 'string', format: 'date-time' },
    progress: { type: 'string', enum: Object.values(DealProgress) },
    roomAccess: { type: 'string', enum: Object.values(RoomAccess) },
    specialInstructions: { type: 'string', nullable: true },
    imageUrl: { type: 'string', nullable: true },
  },
  required: [
    'customerUuid',
    'price',
    'street',
    'city',
    'state',
    'zipCode',
    'roomArea',
    'numberOfPeople',
    'appointmentDate',
    'progress',
    'roomAccess',
  ],
  additionalProperties: false,
};

// PUT deal payload schema
export const putDealRequestSchema = {
  type: 'object',
  properties: {
    customerUuid: { type: 'string', nullable: true },
    price: { type: 'number' },
    street: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    zipCode: { type: 'string' },
    roomArea: { type: 'number' },
    numberOfPeople: { type: 'number' },
    appointmentDate: { type: 'string', format: 'date-time' },
    progress: { type: 'string', enum: Object.values(DealProgress) },
    roomAccess: { type: 'string', enum: Object.values(RoomAccess) },
    specialInstructions: { type: 'string', nullable: true },
    imageUrl: { type: 'string', nullable: true },
  },
  required: [
    'customerUuid',
    'price',
    'street',
    'city',
    'state',
    'zipCode',
    'roomArea',
    'numberOfPeople',
    'appointmentDate',
    'progress',
    'roomAccess',
    'specialInstructions',
    'imageUrl',
  ],
  additionalProperties: false,
};

// POST deal payloads
export interface PostDealRequestPayload extends Omit<PublicDeal, 'uuid' | 'customer' | 'createdOn' | 'modifiedOn' | 'deletedOn'> {
  customerUuid: string;
}

export type PostDealResponsePayload = PublicDeal;

// PUT deal payloads
export interface PutDealRequestPayload extends Omit<PublicDeal, 'uuid' | 'customer' | 'createdOn' | 'modifiedOn' | 'deletedOn'> {
  customerUuid: string;
}

export type PutDealResponsePayload = PublicDeal;

// GET customer payloads
export type GetDealResponsePayload = PublicDeal;

// GET customer list payloads
export type GetDealListResponsePayload = PaginatedResponse<PublicDeal>;

export interface GetDealListFilter {
  limit: number;
  offset: number;
  tenantId: number; // TODO: Remove once the tenant is pulled from the token
}
