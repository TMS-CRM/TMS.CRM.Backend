import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { logger } from '../../../lib/utils/logger.js';
import type { GetDealListFilter, GetDealListResponsePayload, PublicDeal } from '../../../models/api/payloads/deal.js';
import { HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import type { ExtendedDealEntry } from '../../../models/database/dealEntry.js';
import { selectDeals } from '../../../repositories/dealRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<null, GetDealListFilter>> {
  logger.info('Start - validateRequest');

  const eventQueryParams = validateAndParseQueryParams<GetDealListFilter>(request, [
    { name: 'limit', dataType: QueryParamDataType.number, required: true },
    { name: 'offset', dataType: QueryParamDataType.number, required: true },
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  // TODO: Pull tenantId and userId from the token
  return { tenantId: eventQueryParams.tenantId, userId: null, payload: null, queryParameters: eventQueryParams };
}

export async function queryRecords(validatedRequest: ValidatedAPIRequest<null, GetDealListFilter>): Promise<PaginatedResponse<ExtendedDealEntry>> {
  logger.info('Start - queryRecords');

  const { limit, offset } = validatedRequest.queryParameters!;

  const queryResult: PaginatedResponse<ExtendedDealEntry> = await selectDeals(limit, offset, validatedRequest.tenantId);

  return queryResult;
}

export async function formatResponseData(queryResult: PaginatedResponse<ExtendedDealEntry>): Promise<FetchSuccess<GetDealListResponsePayload>> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicDeal> = {
    items: await Promise.all(queryResult.items.map((deal) => deal.toPublic())),
    total: queryResult.total,
  };

  return new FetchSuccess<GetDealListResponsePayload>('Successfully fetched deals', paginatedResponse);
}
