import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import { PersistSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { validateAndParseBody, validateAndParsePathParams, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { CustomerEntry } from '../../../models/database/customerEntry.js';
import type { PutCustomerRequestPayload, PutCustomerResponsePayload } from '../../../models/api/payloads/customer.js';
import { selectCustomerByExternalUuid, selectCustomerById, updateCustomer } from '../../../repositories/customerRepository.js';
import { putCustomerRequestSchema } from '../../../models/api/payloads/customer.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error) => new HttpErrorResponse(error));
}

async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<PutCustomerRequestPayload>> {
  logger.info('Start - validateRequest');

  const parsedRequestBody = validateAndParseBody<PutCustomerRequestPayload>(request, putCustomerRequestSchema);
  const parsedPathParameter = validateAndParsePathParams<{ [param: string]: string }>(request, ['uuid']);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: parsedRequestBody, pathParameter: parsedPathParameter.uuid };
}

export async function persistRecords(validatedRequest: ValidatedAPIRequest<PutCustomerRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the customer exists
  const customer = await selectCustomerByExternalUuid(validatedRequest.pathParameter!);

  if (!customer) {
    throw new BadRequestError('Customer not found');
  }

  // Update the customer
  const mappedCustomer: Partial<CustomerEntry> = CustomerEntry.fromPutRequestPayload(validatedRequest.payload);
  await updateCustomer(customer.Id, mappedCustomer);

  return customer.Id;
}

export async function formatResponseData(customerId: number): Promise<PersistSuccess<PutCustomerResponsePayload>> {
  logger.info('Start - formatResponse');

  const customer = await selectCustomerById(customerId);

  if (!customer) {
    throw new BadRequestError('Customer not found');
  }

  return new PersistSuccess<PutCustomerResponsePayload>('Customer has been updated', customer.toPublic());
}
