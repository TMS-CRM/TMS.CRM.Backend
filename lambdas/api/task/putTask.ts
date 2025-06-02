import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import { type PutTaskRequestPayload, type PutTaskResponsePayload, putTaskRequestSchema } from '../../../models/api/payloads/task.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { Task, type TaskDatabase } from '../../../models/entities/task.js';
import { selectTaskByExternalUuid, selectTaskById, updateTask } from '../../../repositories/taskRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PutTaskRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PutTaskRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: putTaskRequestSchema,
    expectedPathParameter: 'uuid',
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PutTaskRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the task exists
  const task = await selectTaskByExternalUuid(validatedRequest.pathParameter!);

  if (!task) {
    throw new BadRequestError('Task not found');
  }

  // Update the task
  const mappedTask: Partial<TaskDatabase> = Task.update(validatedRequest.body!);
  await updateTask(task.id, mappedTask);

  return task.id;
}

export async function formatResponseData(taskId: number): Promise<PersistSuccess<PutTaskResponsePayload>> {
  logger.info('Start - formatResponse');

  const task = await selectTaskById(taskId);

  if (!task) {
    throw new BadRequestError('Task not found');
  }

  return new PersistSuccess<PutTaskResponsePayload>('Task has been updated', task.toPublic());
}
