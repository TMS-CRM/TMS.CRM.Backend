// Switch tenant request payload schema
export const switchTenantRequestSchema = {
  type: 'object',
  properties: {
    tenantUuid: { type: 'string' },
  },
  required: ['tenantUuid'],
  additionalProperties: false,
};

// Switch tenant request payload
export type SwitchTenantRequestPayload = {
  tenantUuid: string;
};

// Switch tenant response payload
export type SwitchTenantResponsePayload = {
  accessToken: string;
  idToken: string;
};
