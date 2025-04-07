import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { PersistSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { validateAndParseBody, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import {
  postActivityRequestSchema,
  type PostActivityRequestPayload,
  type PostActivityResponsePayload,
} from '../../../models/api/payloads/activity.js';
import { ActivityEntry } from '../../../models/database/activityEntry.js';
import { insertActivity, selectActivityById } from '../../../repositories/activityRepository.js';
import { selectDealByExternalUuid } from '../../../repositories/dealRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error) => new HttpErrorResponse(error));
}

async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<PostActivityRequestPayload>> {
  logger.info('Start - validateRequest');

  const parsedRequestBody = validateAndParseBody<PostActivityRequestPayload>(request, postActivityRequestSchema);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: parsedRequestBody };
}

export async function persistRecords(validatedRequest: ValidatedAPIRequest<PostActivityRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Select deal
  const deal = await selectDealByExternalUuid(validatedRequest.payload.dealUuid);
  if (!deal) {
    throw new BadRequestError('Deal does not exist');
  }

  const mappedActivity: Partial<ActivityEntry> = {
    ...ActivityEntry.fromPostRequestPayload(validatedRequest.payload, deal.Id),
    TenantId: validatedRequest.tenantId,
  };
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
