import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import { DealSortBy, type GetDealListFilter, type GetDealListResponsePayload, type PublicDeal } from '../../../models/api/payloads/deal.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType, SortOrder, ValidatedApiRequest } from '../../../models/api/validations.js';
import { type Deal } from '../../../models/entities/deal.js';
import { selectDeals } from '../../../repositories/dealRepository.js';
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
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null, GetDealListFilter>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest({
    request,
    expectAccessToken: true,
    expectedQueryParameters: [
      { name: 'limit', dataType: QueryParamDataType.number, required: true },
      { name: 'offset', dataType: QueryParamDataType.number, required: true },
      { name: 'search', dataType: QueryParamDataType.string, required: false },
      { name: 'sortBy', dataType: QueryParamDataType.enum, required: false, enumType: DealSortBy },
      { name: 'order', dataType: QueryParamDataType.enum, required: false, enumType: SortOrder },
      { name: 'from', dataType: QueryParamDataType.date, required: false },
      { name: 'to', dataType: QueryParamDataType.date, required: false },
      { name: 'progress', dataType: QueryParamDataType.array, required: false },
    ],
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null, GetDealListFilter>): Promise<PaginatedResponse<Deal>> {
  logger.info('Start - queryRecords');

  const tenant = await selectTenantByExternalUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const queryResult: PaginatedResponse<Deal> = await selectDeals(tenant.id, validatedRequest.queryParameters!);

  return queryResult;
}

export async function formatResponseData(queryResult: PaginatedResponse<Deal>): Promise<FetchSuccess<GetDealListResponsePayload>> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicDeal> = {
    items: await Promise.all(queryResult.items.map((deal) => deal.toPublic())),
    total: queryResult.total,
  };

  return new FetchSuccess<GetDealListResponsePayload>('Successfully fetched deals', paginatedResponse);
}
