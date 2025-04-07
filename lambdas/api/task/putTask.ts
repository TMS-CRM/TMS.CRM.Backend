import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { validateAndParseBody, validateAndParsePathParams, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { logger } from '../../../lib/utils/logger.js';
import { type PutTaskRequestPayload, type PutTaskResponsePayload, putTaskRequestSchema } from '../../../models/api/payloads/task.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import { TaskEntry } from '../../../models/database/taskEntry.js';
import { selectTaskByExternalUuid, selectTaskById, updateTask } from '../../../repositories/taskRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<PutTaskRequestPayload>> {
  logger.info('Start - validateRequest');

  const parsedRequestBody = validateAndParseBody<PutTaskRequestPayload>(request, putTaskRequestSchema);
  const parsedPathParameter = validateAndParsePathParams<{ [param: string]: string }>(request, ['uuid']);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: parsedRequestBody, pathParameter: parsedPathParameter.uuid };
}

export async function persistRecords(validatedRequest: ValidatedAPIRequest<PutTaskRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the task exists
  const task = await selectTaskByExternalUuid(validatedRequest.pathParameter!);

  if (!task) {
    throw new BadRequestError('Task not found');
  }

  // Update the task
  const mappedTask: Partial<TaskEntry> = TaskEntry.fromPutRequestPayload(validatedRequest.payload);
  await updateTask(task.Id, mappedTask);

  return task.Id;
}

export async function formatResponseData(taskId: number): Promise<PersistSuccess<PutTaskResponsePayload>> {
  logger.info('Start - formatResponse');

  const task = await selectTaskById(taskId);

  if (!task) {
    throw new BadRequestError('Task not found');
  }

  return new PersistSuccess<PutTaskResponsePayload>('Task has been updated', task.toPublic());
}
