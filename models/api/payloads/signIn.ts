// Sign in payload schema
export const signInRequestSchema = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    password: { type: 'string' },
  },
  required: ['email', 'password'],
  additionalProperties: false,
};

// Sign in payload
export type SignInRequestPayload = {
  email: string;
  password: string;
};

// Sign in response payload
export type SignInResponsePayload = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};
