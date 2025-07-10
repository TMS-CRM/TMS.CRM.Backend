import type { integer } from 'aws-sdk/clients/cloudfront.js';
import { DealProgress, RoomAccess } from '../../entities/deal.js';
import type { PaginatedResponse } from '../responses/pagination.js';
import type { SortOrder } from '../validations.js';

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
  street: string;
  city: string;
  state: string;
  zipCode: string;
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
  ],
  additionalProperties: false,
};

// POST deal payloads
export type PostDealRequestPayload = Omit<PublicDeal, 'uuid' | 'customer' | 'createdOn' | 'modifiedOn' | 'deletedOn' | 'imageUrl'> & {
  customerUuid: string;
};

export type PostDealResponsePayload = PublicDeal;

// PUT deal payloads
export type PutDealRequestPayload = Omit<PublicDeal, 'uuid' | 'customer' | 'createdOn' | 'modifiedOn' | 'deletedOn' | 'imageUrl'> & {
  customerUuid: string;
};

export type PutDealResponsePayload = PublicDeal;

// GET customer payloads
export type GetDealResponsePayload = PublicDeal;

// GET customer list payloads
export type GetDealListResponsePayload = PaginatedResponse<PublicDeal>;

export interface GetDealListFilter {
  limit: number;
  offset: number;
  sortBy?: DealSortBy;
  order?: SortOrder;
  search?: string;

  /** ISO 8601 UTC date string to filter deals starting from this time */
  from?: string;

  /** ISO 8601 UTC date string to filter deals up to this time */
  to?: string;

  /** Deal progress to filter deals by */
  progress?: DealProgress[];
}

// Map the sortBy field to the database field name
export enum DealSortBy {
  createdOn = 'created_on',
  modifiedOn = 'modified_on',
  appointmentDate = 'appointment_date',
}
