import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import type { GetActivityListFilter, GetActivityListResponsePayload, PublicActivity } from '../../../models/api/payloads/activity.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType, ValidatedApiRequest } from '../../../models/api/validations.js';
import type { Activity } from '../../../models/entities/activity.js';
import { selectActivities } from '../../../repositories/activityRepository.js';
import { selectTenantByExternalUuid } from '../../../repositories/tenantRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null, GetActivityListFilter>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<null, GetActivityListFilter>({
    request,
    expectAccessToken: true,
    expectedQueryParameters: [
      { name: 'limit', dataType: QueryParamDataType.number, required: true },
      { name: 'offset', dataType: QueryParamDataType.number, required: true },
    ],
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null, GetActivityListFilter>): Promise<PaginatedResponse<Activity>> {
  logger.info('Start - queryRecords');

  const tenant = await selectTenantByExternalUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const { limit, offset } = validatedRequest.queryParameters!;

  const queryResult: PaginatedResponse<Activity> = await selectActivities(limit, offset, tenant.id);

  return queryResult;
}

export function formatResponseData(queryResult: PaginatedResponse<Activity>): FetchSuccess<GetActivityListResponsePayload> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicActivity> = {
    items: queryResult.items.map((activity) => activity.toPublic()),
    total: queryResult.total,
  };

  return new FetchSuccess<GetActivityListResponsePayload>('Successfully fetched activities', paginatedResponse);
}
