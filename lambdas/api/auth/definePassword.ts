import { AdminRespondToAuthChallengeCommand, type AuthenticationResultType, ChallengeNameType } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getCognitoClient } from '../../../lib/aws/cognito.js';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import {
  type DefinePasswordRequestPayload,
  type DefinePasswordResponsePayload,
  definePasswordRequestSchema,
} from '../../../models/api/payloads/auth/definePassword.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received');

  return validateRequest(request)
    .then(authenticateUser)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<DefinePasswordRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<DefinePasswordRequestPayload>({
    request,
    expectedAuthenticated: false,
    expectedBodySchema: definePasswordRequestSchema,
  });
}

async function authenticateUser(validatedRequest: ValidatedApiRequest<DefinePasswordRequestPayload>): Promise<AuthenticationResultType> {
  logger.info('Start - authenticateUser');

  const { email, password, session } = validatedRequest.body!;

  const response = await getCognitoClient().send(
    new AdminRespondToAuthChallengeCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
      ChallengeResponses: {
        USERNAME: email,
        NEW_PASSWORD: password,
      },
      Session: session,
    }),
  );

  if (!response.AuthenticationResult) {
    throw new BadRequestError('Failed to define password');
  }

  return response.AuthenticationResult;
}

function formatResponseData(authenticationResult: AuthenticationResultType): PersistSuccess<DefinePasswordResponsePayload> {
  logger.info('Start - formatResponse');

  const responsePayload: DefinePasswordResponsePayload = {
    accessToken: authenticationResult.AccessToken!,
    idToken: authenticationResult.IdToken!,
    refreshToken: authenticationResult.RefreshToken!,
  };

  return new PersistSuccess<DefinePasswordResponsePayload>('Password has been defined', responsePayload);
}
