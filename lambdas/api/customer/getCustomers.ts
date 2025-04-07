import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import type { GetCustomerListFilter, GetCustomerListResponsePayload, PublicCustomer } from '../../../models/api/payloads/customer.js';
import type { CustomerEntry } from '../../../models/database/customerEntry.js';
import { selectCustomers } from '../../../repositories/customerRepository.js';
import { HttpErrorResponse } from '../../../models/api/responses/errors.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error) => new HttpErrorResponse(error));
}

async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<null, GetCustomerListFilter>> {
  logger.info('Start - validateRequest');

  const eventQueryParams = validateAndParseQueryParams<GetCustomerListFilter>(request, [
    { name: 'limit', dataType: QueryParamDataType.number, required: true },
    { name: 'offset', dataType: QueryParamDataType.number, required: true },
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  // TODO: Pull tenantId and userId from the token
  return { tenantId: eventQueryParams.tenantId, userId: null, payload: null, queryParameters: eventQueryParams };
}

export async function queryRecords(validatedRequest: ValidatedAPIRequest<null, GetCustomerListFilter>): Promise<PaginatedResponse<CustomerEntry>> {
  logger.info('Start - queryRecords');

  const { limit, offset } = validatedRequest.queryParameters!;

  const queryResult: PaginatedResponse<CustomerEntry> = await selectCustomers(limit, offset, validatedRequest.tenantId);

  return queryResult;
}

export async function formatResponseData(queryResult: PaginatedResponse<CustomerEntry>): Promise<FetchSuccess<GetCustomerListResponsePayload>> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicCustomer> = {
    items: queryResult.items.map((customer) => customer.toPublic()),
    total: queryResult.total,
  };

  return new FetchSuccess<GetCustomerListResponsePayload>('Successfully fetched customers', paginatedResponse);
}
