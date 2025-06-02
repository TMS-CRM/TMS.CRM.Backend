import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import type { GetDealListFilter, GetDealListResponsePayload, PublicDeal } from '../../../models/api/payloads/deal.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType, ValidatedApiRequest } from '../../../models/api/validations.js';
import type { Deal } from '../../../models/entities/deal.js';
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
    expectedAuthenticated: true,
    expectedQueryParameters: [
      { name: 'limit', dataType: QueryParamDataType.number, required: true },
      { name: 'offset', dataType: QueryParamDataType.number, required: true },
    ],
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null, GetDealListFilter>): Promise<PaginatedResponse<Deal>> {
  logger.info('Start - queryRecords');

  const tenant = await selectTenantByExternalUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const { limit, offset } = validatedRequest.queryParameters!;
  const queryResult: PaginatedResponse<Deal> = await selectDeals(limit, offset, tenant.id);

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
