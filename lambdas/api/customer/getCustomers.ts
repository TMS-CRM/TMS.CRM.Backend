import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { GetCustomerListFilter, GetCustomerListResponsePayload, PublicCustomer } from '../../../models/api/payloads/customer.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType, ValidatedApiRequest } from '../../../models/api/validations.js';
import type { CustomerEntry } from '../../../models/entities/customerEntry.js';
import { selectCustomers } from '../../../repositories/customerRepository.js';
import { selectTenantByUuid } from '../../../repositories/tenantRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null, GetCustomerListFilter>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<null, GetCustomerListFilter>({
    request,
    expectedAuthenticated: true,
    expectedQueryParameters: [
      { name: 'limit', dataType: QueryParamDataType.number, required: true },
      { name: 'offset', dataType: QueryParamDataType.number, required: true },
    ],
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null, GetCustomerListFilter>): Promise<PaginatedResponse<CustomerEntry>> {
  logger.info('Start - queryRecords');

  const tenant = await selectTenantByUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const { limit, offset } = validatedRequest.queryParameters!;
  const queryResult: PaginatedResponse<CustomerEntry> = await selectCustomers(limit, offset, tenant.Id);

  return queryResult;
}

export function formatResponseData(queryResult: PaginatedResponse<CustomerEntry>): FetchSuccess<GetCustomerListResponsePayload> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicCustomer> = {
    items: queryResult.items.map((customer) => customer.toPublic()),
    total: queryResult.total,
  };

  return new FetchSuccess<GetCustomerListResponsePayload>('Successfully fetched customers', paginatedResponse);
}
