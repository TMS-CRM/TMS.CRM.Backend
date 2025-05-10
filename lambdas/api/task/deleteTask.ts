import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { DeleteSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { selectTaskByExternalUuid, softDeleteTaskById } from '../../../repositories/taskRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
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

export async function persistRecords(validatedRequest: ValidatedApiRequest<null>): Promise<void> {
  logger.info('Start - persistRecords');

  // Validate the task exists
  const task = await selectTaskByExternalUuid(validatedRequest.pathParameter!);

  if (!task) {
    throw new BadRequestError('Task not found');
  }

  // Soft delete the task
  await softDeleteTaskById(task.Id);
}

export function formatResponseData(): DeleteSuccess<null> {
  logger.info('Start - formatResponse');

  return new DeleteSuccess<null>('Task has been deleted');
}
