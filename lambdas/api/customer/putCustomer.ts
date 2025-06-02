import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import type { PutCustomerRequestPayload, PutCustomerResponsePayload } from '../../../models/api/payloads/customer.js';
import { putCustomerRequestSchema } from '../../../models/api/payloads/customer.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { Customer, type CustomerDatabase } from '../../../models/entities/customer.js';
import { selectCustomerByExternalUuid, selectCustomerById, updateCustomer } from '../../../repositories/customerRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PutCustomerRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PutCustomerRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: putCustomerRequestSchema,
    expectedPathParameter: 'uuid',
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PutCustomerRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the customer exists
  const customer = await selectCustomerByExternalUuid(validatedRequest.pathParameter!);
  if (!customer) {
    throw new BadRequestError('Customer not found');
  }

  // Update the customer
  const mappedCustomer: Partial<CustomerDatabase> = Customer.update(validatedRequest.body!);
  await updateCustomer(customer.id, mappedCustomer);

  return customer.id;
}

export async function formatResponseData(customerId: number): Promise<PersistSuccess<PutCustomerResponsePayload>> {
  logger.info('Start - formatResponse');

  const customer = await selectCustomerById(customerId);

  if (!customer) {
    throw new BadRequestError('Customer not found');
  }

  return new PersistSuccess<PutCustomerResponsePayload>('Customer has been updated', customer.toPublic());
}
