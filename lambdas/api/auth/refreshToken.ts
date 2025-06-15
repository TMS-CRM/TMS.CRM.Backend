import { AdminInitiateAuthCommand, AuthFlowType, type AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getCognitoClient } from '../../../lib/aws/cognito.js';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import { type RefreshTokenResponsePayload } from '../../../models/api/payloads/auth/refreshToken.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received for token refresh');

  return validateRequest(request)
    .then(refreshToken)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<null>({
    request,
    expectAccessToken: true,
    expectRefreshToken: true,
  });
}

async function refreshToken(validatedRequest: ValidatedApiRequest<null>): Promise<AuthenticationResultType> {
  logger.info('Start - refreshTokens');

  const response = await getCognitoClient().send(
    new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: validatedRequest.refreshToken!,
      },
      ClientMetadata: {
        preferredTenantUuid: validatedRequest.tenantUuid!, // Keep the current tenant
      },
    }),
  );

  if (!response.AuthenticationResult) {
    throw new BadRequestError('Token refresh failed');
  }

  return response.AuthenticationResult;
}

function formatResponseData(authenticationResult: AuthenticationResultType): PersistSuccess<RefreshTokenResponsePayload> {
  logger.info('Start - formatResponseData');

  const responsePayload: RefreshTokenResponsePayload = {
    accessToken: authenticationResult.AccessToken!,
    idToken: authenticationResult.IdToken!,
  };

  return new PersistSuccess<RefreshTokenResponsePayload>('Token has been refreshed', responsePayload);
}
