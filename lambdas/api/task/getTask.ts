import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { GetTaskResponsePayload } from '../../../models/api/payloads/task.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import type { TaskEntry } from '../../../models/entities/taskEntry.js';
import { selectTaskByExternalUuid } from '../../../repositories/taskRepository.js';

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

export async function queryRecords(validatedRequest: ValidatedApiRequest<null>): Promise<TaskEntry> {
  logger.info('Start - queryRecords');

  // Validate the task if exists
  const task = await selectTaskByExternalUuid(validatedRequest.pathParameter!);

  if (!task) {
    throw new BadRequestError('Task not found');
  }

  return task;
}

export function formatResponseData(task: TaskEntry): FetchSuccess<GetTaskResponsePayload> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<GetTaskResponsePayload>('Successfully fetched task', task.toPublic());
}
