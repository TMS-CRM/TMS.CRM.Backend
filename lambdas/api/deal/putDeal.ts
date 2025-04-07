import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { validateAndParseBody, validateAndParsePathParams, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { logger } from '../../../lib/utils/logger.js';
import { type PutDealRequestPayload, type PutDealResponsePayload, putDealRequestSchema } from '../../../models/api/payloads/deal.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import { DealEntry } from '../../../models/database/dealEntry.js';
import { selectDealByExternalUuid, selectDealById, updateDeal } from '../../../repositories/dealRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<PutDealRequestPayload>> {
  logger.info('Start - validateRequest');
  // Declare required field
  const parsedRequestBody = validateAndParseBody<PutDealRequestPayload>(request, putDealRequestSchema);
  const parsedPathParameter = validateAndParsePathParams<{ [param: string]: string }>(request, ['uuid']);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: parsedRequestBody, pathParameter: parsedPathParameter.uuid };
}

async function persistRecords(validatedRequest: ValidatedAPIRequest<PutDealRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the deal exists
  const deal = await selectDealByExternalUuid(validatedRequest.pathParameter!);

  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  // Update the deal
  const mappedDeal: Partial<DealEntry> = DealEntry.fromPutRequestPayload(validatedRequest.payload);
  await updateDeal(deal.Id, mappedDeal);

  return deal.Id;
}

async function formatResponseData(dealId: number): Promise<PersistSuccess<PutDealResponsePayload>> {
  logger.info('Start - formatResponse');

  const deal = await selectDealById(dealId);

  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  return new PersistSuccess<PutDealResponsePayload>('Deal has been updated', deal.toPublic());
}
