import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { PersistSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { validateAndParseBody, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { QueryParamDataType, type ValidatedAPIRequest } from '../../../models/api/validations.js';
import type { PostCustomerRequestPayload, PostCustomerResponsePayload } from '../../../models/api/payloads/customer.js';
import { CustomerEntry } from '../../../models/database/customerEntry.js';
import { insertCustomer, selectCustomerById } from '../../../repositories/customerRepository.js';
import { postCustomerRequestSchema } from '../../../models/api/payloads/customer.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error) => new HttpErrorResponse(error));
}

async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<PostCustomerRequestPayload>> {
  logger.info('Start - validateRequest');

  const parsedRequestBody = validateAndParseBody<PostCustomerRequestPayload>(request, postCustomerRequestSchema);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: parsedRequestBody };
}

export async function persistRecords(validatedRequest: ValidatedAPIRequest<PostCustomerRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const mappedCustomer: Partial<CustomerEntry> = CustomerEntry.fromPostRequestPayload(validatedRequest.payload, validatedRequest.tenantId);
  const customerId = await insertCustomer(mappedCustomer);

  return customerId;
}

export async function formatResponseData(customerId: number): Promise<PersistSuccess<PostCustomerResponsePayload>> {
  logger.info('Start - formatResponse');

  const customer = await selectCustomerById(customerId);

  if (!customer) {
    throw new BadRequestError('Customer not found');
  }

  return new PersistSuccess<PostCustomerResponsePayload>('Customer has been created', customer.toPublic());
}
