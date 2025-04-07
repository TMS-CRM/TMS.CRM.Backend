import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { validateAndParseBody, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import { postTaskRequestSchema, type PostTaskRequestPayload, type PostTaskResponsePayload } from '../../../models/api/payloads/task.js';
import { TaskEntry } from '../../../models/database/taskEntry.js';
import { insertTask, selectTaskById } from '../../../repositories/taskRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error) => new HttpErrorResponse(error));
}

async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<PostTaskRequestPayload>> {
  logger.info('Start - validateRequest');

  const parsedRequestBody = validateAndParseBody<PostTaskRequestPayload>(request, postTaskRequestSchema);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: parsedRequestBody };
}

export async function persistRecords(validatedRequest: ValidatedAPIRequest<PostTaskRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const mappedTask: Partial<TaskEntry> = {
    ...TaskEntry.fromPostRequestPayload(validatedRequest.payload),
    TenantId: validatedRequest.tenantId,
  };
  const taskId = await insertTask(mappedTask);

  return taskId;
}

export async function formatResponseData(taskId: number): Promise<PersistSuccess<PostTaskResponsePayload>> {
  logger.info('Start - formatResponse');

  const task = await selectTaskById(taskId);

  if (!task) {
    throw new BadRequestError('Task not found');
  }

  return new PersistSuccess<PostTaskResponsePayload>('Task has been created', task.toPublic());
}
