// Refresh token request payload schema
export const refreshTokenRequestSchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string' },
  },
  required: ['refreshToken'],
  additionalProperties: false,
};

// Refresh token request payload
export type RefreshTokenRequestPayload = {
  refreshToken: string;
};

// Refresh token response payload
export type RefreshTokenResponsePayload = {
  accessToken: string;
  idToken: string;
};
