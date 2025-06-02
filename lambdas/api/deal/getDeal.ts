import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import type { GetDealResponsePayload } from '../../../models/api/payloads/deal.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import type { Deal } from '../../../models/entities/deal.js';
import { selectDealByExternalUuid } from '../../../repositories/dealRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
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

export async function queryRecords(validatedRequest: ValidatedApiRequest<null>): Promise<Deal> {
  logger.info('Start - queryRecords');

  // Validate the deal if exists
  const deal = await selectDealByExternalUuid(validatedRequest.pathParameter!);

  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  return deal;
}

export function formatResponseData(deal: Deal): FetchSuccess<GetDealResponsePayload> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<GetDealResponsePayload>('Successfully fetched deal', deal.toPublic());
}
