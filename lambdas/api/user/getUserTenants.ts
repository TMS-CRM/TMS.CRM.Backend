import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import type { GetUserTenantsResponsePayload } from '../../../models/api/payloads/user.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import type { Tenant } from '../../../models/entities/tenant.js';
import { selectUserByExternalUuid } from '../../../repositories/userRepository.js';
import { selectUserTenants } from '../../../repositories/userTenantRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
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
    expectedPathParameter: 'uuid',
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null>): Promise<Tenant[]> {
  logger.info('Start - queryRecords');

  // Validate the user exists
  const user = await selectUserByExternalUuid(validatedRequest.pathParameter!);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  // Query the tenants the user has access to
  return await selectUserTenants(user.id);
}

export function formatResponseData(tenants: Tenant[]): FetchSuccess<GetUserTenantsResponsePayload> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<GetUserTenantsResponsePayload>(
    'Successfully fetched user tenants',
    tenants.map((tenant) => tenant.toPublic()),
  );
}
