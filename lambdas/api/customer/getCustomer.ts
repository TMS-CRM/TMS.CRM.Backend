import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { GetCustomerResponsePayload } from '../../../models/api/payloads/customer.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import type { CustomerEntry } from '../../../models/entities/customerEntry.js';
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
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest({
    request,
    expectedAuthenticated: true,
    expectedPathParameter: 'uuid',
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null>): Promise<CustomerEntry> {
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
