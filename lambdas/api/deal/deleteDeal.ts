import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { DeleteSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { selectDealByExternalUuid, softDeleteDealById } from '../../../repositories/dealRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest({
    request,
    expectAccessToken: true,
    expectedPathParameter: 'uuid',
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<null>): Promise<void> {
  logger.info('Start - persistRecords');

  // Validate the deal exists
  const deal = await selectDealByExternalUuid(validatedRequest.pathParameter!);

  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  // Soft delete the deal
  await softDeleteDealById(deal.id);
}

export function formatResponseData(): DeleteSuccess<null> {
  logger.info('Start - formatResponse');

  return new DeleteSuccess<null>('Deal has been deleted');
}
