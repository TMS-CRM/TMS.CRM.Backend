import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { logger } from '../../../lib/utils/logger.js';
import type { GetActivityListFilter, GetActivityListResponsePayload, PublicActivity } from '../../../models/api/payloads/activity.js';
import { HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import type { ExtendedActivityEntry } from '../../../models/database/activityEntry.js';
import { selectActivities } from '../../../repositories/activityRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<null, GetActivityListFilter>> {
  logger.info('Start - validateRequest');

  const eventQueryParams = validateAndParseQueryParams<GetActivityListFilter>(request, [
    { name: 'limit', dataType: QueryParamDataType.number, required: true },
    { name: 'offset', dataType: QueryParamDataType.number, required: true },
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  // TODO: Pull tenantId and userId from the token
  return { tenantId: eventQueryParams.tenantId, userId: null, payload: null, queryParameters: eventQueryParams };
}

export async function queryRecords(
  validatedRequest: ValidatedAPIRequest<null, GetActivityListFilter>,
): Promise<PaginatedResponse<ExtendedActivityEntry>> {
  logger.info('Start - queryRecords');

  const { limit, offset } = validatedRequest.queryParameters!;

  const queryResult: PaginatedResponse<ExtendedActivityEntry> = await selectActivities(limit, offset, validatedRequest.tenantId);

  return queryResult;
}

export function formatResponseData(queryResult: PaginatedResponse<ExtendedActivityEntry>): FetchSuccess<GetActivityListResponsePayload> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicActivity> = {
    items: queryResult.items.map((activity) => activity.toPublic()),
    total: queryResult.total,
  };

  return new FetchSuccess<GetActivityListResponsePayload>('Successfully fetched activities', paginatedResponse);
}
