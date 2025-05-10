import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { GetActivityResponsePayload } from '../../../models/api/payloads/activity.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import type { ExtendedActivityEntry } from '../../../models/database/activityEntry.js';
import { selectActivityByExternalUuid } from '../../../repositories/activityRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
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

export async function queryRecords(validatedRequest: ValidatedApiRequest<null>): Promise<ExtendedActivityEntry> {
  logger.info('Start - queryRecords');

  // Validate the activity if exists
  const activity = await selectActivityByExternalUuid(validatedRequest.pathParameter!);

  if (!activity) {
    throw new BadRequestError('Activity not found');
  }

  return activity;
}

export function formatResponseData(activity: ExtendedActivityEntry): FetchSuccess<GetActivityResponsePayload> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<GetActivityResponsePayload>('Successfully fetched activity', activity.toPublic());
}
