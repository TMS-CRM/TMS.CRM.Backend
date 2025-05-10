import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { PostCustomerRequestPayload, PostCustomerResponsePayload } from '../../../models/api/payloads/customer.js';
import { postCustomerRequestSchema } from '../../../models/api/payloads/customer.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { CustomerEntry } from '../../../models/database/customerEntry.js';
import { insertCustomer, selectCustomerById } from '../../../repositories/customerRepository.js';
import { selectTenantByUuid } from '../../../repositories/tenantRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PostCustomerRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PostCustomerRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: postCustomerRequestSchema,
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PostCustomerRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const tenant = await selectTenantByUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const mappedCustomer: Partial<CustomerEntry> = CustomerEntry.fromPostRequestPayload(tenant.Id, validatedRequest.body!);
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
