import { AdminInitiateAuthCommand, type AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getCognitoClient } from '../../../lib/aws/cognito.js';
import { logger } from '../../../lib/utils/logger.js';
import type { SwitchTenantResponsePayload } from '../../../models/api/payloads/switchTenant.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { selectTenantByExternalUuid } from '../../../repositories/tenantRepository.js';
import { selectUserByCognitoUuid } from '../../../repositories/userRepository.js';
import { selectUserTenantsByUserId } from '../../../repositories/userTenantRepository.js';

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(validatePreferredTenant)
    .then(authenticateUser)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest({
    request,
    expectedAuthenticated: true,
    expectedPathParameter: 'tenantUuid',
  });
}

async function validatePreferredTenant(validatedRequest: ValidatedApiRequest<null>): Promise<{ preferredTenantUuid: string; refreshToken: string }> {
  logger.info('Start - validatePreferredTenant');

  const preferredTenantUuid = validatedRequest.pathParameter!;
  const tenant = await selectTenantByExternalUuid(preferredTenantUuid);
  if (!tenant) {
    throw new BadRequestError('Tenant not found');
  }

  const user = await selectUserByCognitoUuid(validatedRequest.userCognitoUuid!);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  const userTenants = await selectUserTenantsByUserId(user.id);
  if (!userTenants?.length) {
    throw new BadRequestError('User does not have access to this tenant');
  }

  const userPreferredTenant = userTenants.find((userTenant) => userTenant.tenantId === tenant.id);
  if (!userPreferredTenant) {
    throw new BadRequestError('User does not have access to this tenant');
  }

  return { preferredTenantUuid, refreshToken: validatedRequest.refreshToken! };
}

async function authenticateUser(payload: { preferredTenantUuid: string; refreshToken: string }): Promise<AuthenticationResultType> {
  logger.info('Start - authenticateUser');

  const { preferredTenantUuid, refreshToken } = payload;

  const authCommand = new AdminInitiateAuthCommand({
    UserPoolId: USER_POOL_ID,
    ClientId: USER_POOL_CLIENT_ID,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
    ClientMetadata: {
      preferredTenantUuid,
    },
  });

  const response = await getCognitoClient().send(authCommand);
  if (!response.AuthenticationResult) {
    throw new BadRequestError('Authentication failed');
  }

  return response.AuthenticationResult;
}

function formatResponseData(authenticationResult: AuthenticationResultType): FetchSuccess<SwitchTenantResponsePayload> {
  logger.info('Start - formatResponse');

  const responsePayload: SwitchTenantResponsePayload = {
    accessToken: authenticationResult.AccessToken!,
    idToken: authenticationResult.IdToken!,
    refreshToken: authenticationResult.RefreshToken!,
  };

  return new FetchSuccess<SwitchTenantResponsePayload>('User has been authenticated in the new tenant', responsePayload);
}
