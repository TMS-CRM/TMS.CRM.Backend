import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { type PostDealRequestPayload, type PostDealResponsePayload, postDealRequestSchema } from '../../../models/api/payloads/deal.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { Deal, type DealDatabase } from '../../../models/entities/deal.js';
import { selectCustomerByExternalUuid } from '../../../repositories/customerRepository.js';
import { insertDeal, selectDealById } from '../../../repositories/dealRepository.js';
import { selectTenantByExternalUuid } from '../../../repositories/tenantRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse<PostDealResponsePayload>(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PostDealRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PostDealRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: postDealRequestSchema,
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PostDealRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const tenant = await selectTenantByExternalUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const customer = await selectCustomerByExternalUuid(validatedRequest.body!.customerUuid);
  if (!customer) {
    throw new BadRequestError('Customer does not exist');
  }

  const mappedDeal: Partial<DealDatabase> = Deal.create(tenant.id, customer.id, validatedRequest.body!);
  const dealId = await insertDeal(mappedDeal);

  return dealId;
}

export async function formatResponseData(dealId: number): Promise<PersistSuccess<PostDealResponsePayload>> {
  logger.info('Start - formatResponse');

  const deal = await selectDealById(dealId);
  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  return new PersistSuccess<PostDealResponsePayload>('Deal has been created', deal.toPublic());
}
