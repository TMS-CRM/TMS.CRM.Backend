import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { validateAndParsePathParams, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { logger } from '../../../lib/utils/logger.js';
import type { GetCustomerResponsePayload } from '../../../models/api/payloads/customer.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType, type ValidatedAPIRequest } from '../../../models/api/validations.js';
import type { CustomerEntry } from '../../../models/database/customerEntry.js';
import { selectCustomerByExternalUuid } from '../../../repositories/customerRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<null>> {
  logger.info('Start - validateRequest');

  const parsedPathParameter = validateAndParsePathParams<{ [param: string]: string }>(request, ['uuid']);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: null, pathParameter: parsedPathParameter.uuid };
}

export async function queryRecords(validatedRequest: ValidatedAPIRequest<null>): Promise<CustomerEntry> {
  logger.info('Start - queryRecords');

  // Validate the customer if exists
  const customer = await selectCustomerByExternalUuid(validatedRequest.pathParameter!);

  if (!customer) {
    throw new BadRequestError('Customer not found');
  }

  return customer;
}

export function formatResponseData(customer: CustomerEntry): FetchSuccess<GetCustomerResponsePayload> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<GetCustomerResponsePayload>('Successfully fetched customer', customer.toPublic());
}
