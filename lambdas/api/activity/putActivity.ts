import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { PutActivityRequestPayload, PutActivityResponsePayload } from '../../../models/api/payloads/activity.js';
import { putActivityRequestSchema } from '../../../models/api/payloads/activity.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { Activity, type ActivityDatabase } from '../../../models/entities/activity.js';
import { selectActivityByExternalUuid, selectActivityById, updateActivity } from '../../../repositories/activityRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PutActivityRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PutActivityRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: putActivityRequestSchema,
    expectedPathParameter: 'uuid',
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PutActivityRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the activity exists
  const activity = await selectActivityByExternalUuid(validatedRequest.pathParameter!);

  if (!activity) {
    throw new BadRequestError('Activity not found');
  }

  // Update the activity
  const mappedActivity: Partial<ActivityDatabase> = Activity.update(validatedRequest.body!);
  await updateActivity(activity.id, mappedActivity);

  return activity.id;
}

export async function formatResponseData(activityId: number): Promise<PersistSuccess<PutActivityResponsePayload>> {
  logger.info('Start - formatResponse');

  const activity = await selectActivityById(activityId);

  if (!activity) {
    throw new BadRequestError('Activity not found');
  }

  return new PersistSuccess<PutActivityResponsePayload>('Activity has been updated', activity.toPublic());
}
