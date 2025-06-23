import { AdminInitiateAuthCommand, AuthFlowType, type AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getCognitoClient } from '../../../lib/aws/cognito.js';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import {
  type SwitchTenantRequestPayload,
  type SwitchTenantResponsePayload,
  switchTenantRequestSchema,
} from '../../../models/api/payloads/auth/switchTenant.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { selectTenantByExternalUuid } from '../../../repositories/tenantRepository.js';
import { selectUserByCognitoUuid } from '../../../repositories/userRepository.js';
import { selectUserTenant, updateUserTenant } from '../../../repositories/userTenantRepository.js';

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(validatePreferredTenant)
    .then(authenticateUser)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<SwitchTenantRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest({
    request,
    expectAccessToken: true,
    expectRefreshToken: true,
    expectedBodySchema: switchTenantRequestSchema,
  });
}

async function validatePreferredTenant(validatedRequest: ValidatedApiRequest<SwitchTenantRequestPayload>): Promise<string> {
  logger.info('Start - validatePreferredTenant');

  const preferredTenantUuid = validatedRequest.body!.tenantUuid;
  const tenant = await selectTenantByExternalUuid(preferredTenantUuid);
  if (!tenant) {
    throw new BadRequestError('Tenant not found');
  }

  const user = await selectUserByCognitoUuid(validatedRequest.userCognitoUuid!);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  const userTenant = await selectUserTenant(user.id, tenant.id);
  if (!userTenant) {
    throw new BadRequestError('User does not have access to this tenant');
  }

  // Set the tenant as the most recent tenant that the user has requested to authenticate with
  await updateUserTenant(userTenant.id, { authentication_requested_on: new Date().toISOString() });

  return validatedRequest.refreshToken!;
}

async function authenticateUser(refreshToken: string): Promise<AuthenticationResultType> {
  logger.info('Start - authenticateUser');

  const response = await getCognitoClient().send(
    new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
      // ClientMetadata is ignored on REFRESH_TOKEN_AUTH (can't pass a preferred tenant uuid)
    }),
  );

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
  };

  return new FetchSuccess<SwitchTenantResponsePayload>('User has been authenticated in the new tenant', responsePayload);
}
