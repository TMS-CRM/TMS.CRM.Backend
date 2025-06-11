// Define password payload schema
export const definePasswordRequestSchema = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    password: { type: 'string' },
    session: { type: 'string' },
  },
  required: ['email', 'password', 'session'],
  additionalProperties: false,
};

// Define password payload
export type DefinePasswordRequestPayload = {
  email: string;
  password: string;
  session: string;
};

// Define password response payload
export type DefinePasswordResponsePayload = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};
