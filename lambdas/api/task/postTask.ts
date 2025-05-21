import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { type PostTaskRequestPayload, type PostTaskResponsePayload, postTaskRequestSchema } from '../../../models/api/payloads/task.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { Task, type TaskDatabase } from '../../../models/entities/task.js';
import { insertTask, selectTaskById } from '../../../repositories/taskRepository.js';
import { selectTenantByExternalUuid } from '../../../repositories/tenantRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PostTaskRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PostTaskRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: postTaskRequestSchema,
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PostTaskRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const tenant = await selectTenantByExternalUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const mappedTask: Partial<TaskDatabase> = Task.create(tenant.id, validatedRequest.body!);
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
