import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { validateAndParsePathParams, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import { selectActivityByExternalUuid } from '../../../repositories/activityRepository.js';
import type { ExtendedActivityEntry } from '../../../models/database/activityEntry.js';
import type { GetActivityResponsePayload } from '../../../models/api/payloads/activity.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
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

export async function queryRecords(validatedRequest: ValidatedAPIRequest<null>): Promise<ExtendedActivityEntry> {
  logger.info('Start - queryRecords');

  // Validate the activity if exists
  const activity = await selectActivityByExternalUuid(validatedRequest.pathParameter!);

  if (!activity) {
    throw new BadRequestError('Activity not found');
  }

  return activity;
}

export async function formatResponseData(activity: ExtendedActivityEntry): Promise<FetchSuccess<GetActivityResponsePayload>> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<GetActivityResponsePayload>('Successfully fetched activity', activity.toPublic());
}
