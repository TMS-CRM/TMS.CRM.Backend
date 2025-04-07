import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { DeleteSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { validateAndParsePathParams, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import { selectDealByExternalUuid, softDeleteDealById } from '../../../repositories/dealRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error) => new HttpErrorResponse(error));
}

async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<null>> {
  logger.info('Start - validateRequest');

  const parsedPathParameter = validateAndParsePathParams<{ [param: string]: string }>(request, ['uuid']);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: null, pathParameter: parsedPathParameter.uuid };
}

export async function persistRecords(validatedRequest: ValidatedAPIRequest<null>): Promise<void> {
  logger.info('Start - persistRecords');

  // Validate the deal exists
  const deal = await selectDealByExternalUuid(validatedRequest.pathParameter!);

  if (!deal) {
    throw new BadRequestError('Deal not found');
  }

  // Soft delete the deal
  await softDeleteDealById(deal.Id);
}

export async function formatResponseData(): Promise<DeleteSuccess<null>> {
  logger.info('Start - formatResponse');

  return new DeleteSuccess<null>('Deal has been deleted');
}
