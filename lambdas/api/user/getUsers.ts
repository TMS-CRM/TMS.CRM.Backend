import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { GetUserListFilter, GetUserListResponsePayload, PublicUser } from '../../../models/api/payloads/user.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType, ValidatedApiRequest } from '../../../models/api/validations.js';
import type { UserEntry } from '../../../models/database/userEntry.js';
import { selectTenantByUuid } from '../../../repositories/tenantRepository.js';
import { selectUsers } from '../../../repositories/userRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null, GetUserListFilter>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<null, GetUserListFilter>({
    request,
    expectedAuthenticated: true,
    expectedQueryParameters: [
      { name: 'limit', dataType: QueryParamDataType.number, required: true },
      { name: 'offset', dataType: QueryParamDataType.number, required: true },
    ],
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null, GetUserListFilter>): Promise<PaginatedResponse<UserEntry>> {
  logger.info('Start - queryRecords');

  const tenant = await selectTenantByUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const { limit, offset } = validatedRequest.queryParameters!;
  const queryResult: PaginatedResponse<UserEntry> = await selectUsers(limit, offset, tenant.Id);

  return queryResult;
}

export function formatResponseData(queryResult: PaginatedResponse<UserEntry>): FetchSuccess<GetUserListResponsePayload> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicUser> = {
    items: queryResult.items.map((user) => user.toPublic()),
    total: queryResult.total,
  };

  return new FetchSuccess<GetUserListResponsePayload>('Successfully fetched users', paginatedResponse);
}
