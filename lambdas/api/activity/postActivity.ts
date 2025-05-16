import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import {
  type PostActivityRequestPayload,
  type PostActivityResponsePayload,
  postActivityRequestSchema,
} from '../../../models/api/payloads/activity.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { Activity, type ActivityDatabase } from '../../../models/entities/activity.js';
import { insertActivity, selectActivityById } from '../../../repositories/activityRepository.js';
import { selectDealByExternalUuid } from '../../../repositories/dealRepository.js';
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
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PostActivityRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PostActivityRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: postActivityRequestSchema,
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PostActivityRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const tenant = await selectTenantByUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const deal = await selectDealByExternalUuid(validatedRequest.body!.dealUuid);
  if (!deal) {
    throw new BadRequestError('Deal does not exist');
  }

  const mappedActivity: Partial<ActivityDatabase> = Activity.create(tenant.Id, deal.id, validatedRequest.body!);
  const activityId = await insertActivity(mappedActivity);

  return activityId;
}

export async function formatResponseData(activityId: number): Promise<PersistSuccess<PostActivityResponsePayload>> {
  logger.info('Start - formatResponse');

  const activity = await selectActivityById(activityId);
  if (!activity) {
    throw new BadRequestError('Activity not found');
  }

  return new PersistSuccess<PostActivityResponsePayload>('Activity has been created', activity.toPublic());
}
