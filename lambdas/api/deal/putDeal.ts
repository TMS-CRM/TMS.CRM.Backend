import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import { type PutDealRequestPayload, type PutDealResponsePayload, putDealRequestSchema } from '../../../models/api/payloads/deal.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { Deal, type DealDatabase } from '../../../models/entities/deal.js';
import { selectDealByExternalUuid, selectDealById, updateDeal } from '../../../repositories/dealRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PutDealRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PutDealRequestPayload>({
    request,
    expectAccessToken: true,
    expectedBodySchema: putDealRequestSchema,
    expectedPathParameter: 'uuid',
  });
}

async function persistRecords(validatedRequest: ValidatedApiRequest<PutDealRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the deal exists
  const deal = await selectDealByExternalUuid(validatedRequest.pathParameter!);
  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  // Update the deal
  const mappedDeal: Partial<DealDatabase> = Deal.update(validatedRequest.body!);
  await updateDeal(deal.id, mappedDeal);

  return deal.id;
}

async function formatResponseData(dealId: number): Promise<PersistSuccess<PutDealResponsePayload>> {
  logger.info('Start - formatResponse');

  const deal = await selectDealById(dealId);

  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  return new PersistSuccess<PutDealResponsePayload>('Deal has been updated', deal.toPublic());
}
