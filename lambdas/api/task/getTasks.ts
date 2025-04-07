import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { logger } from '../../../lib/utils/logger.js';
import type { GetTaskListFilter, GetTaskListResponsePayload, PublicTask } from '../../../models/api/payloads/task.js';
import { HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import type { TaskEntry } from '../../../models/database/taskEntry.js';
import { selectTasks } from '../../../repositories/taskRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<null, GetTaskListFilter>> {
  logger.info('Start - validateRequest');

  const eventQueryParams = validateAndParseQueryParams<GetTaskListFilter>(request, [
    { name: 'limit', dataType: QueryParamDataType.number, required: true },
    { name: 'offset', dataType: QueryParamDataType.number, required: true },
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  // TODO: Pull tenantId and userId from the token
  return { tenantId: eventQueryParams.tenantId, userId: null, payload: null, queryParameters: eventQueryParams };
}

export async function queryRecords(validatedRequest: ValidatedAPIRequest<null, GetTaskListFilter>): Promise<PaginatedResponse<TaskEntry>> {
  logger.info('Start - queryRecords');

  const { limit, offset } = validatedRequest.queryParameters!;

  const queryResult: PaginatedResponse<TaskEntry> = await selectTasks(limit, offset, validatedRequest.tenantId);

  return queryResult;
}

export function formatResponseData(queryResult: PaginatedResponse<TaskEntry>): FetchSuccess<GetTaskListResponsePayload> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicTask> = {
    items: queryResult.items.map((task) => task.toPublic()),
    total: queryResult.total,
  };

  return new FetchSuccess<GetTaskListResponsePayload>('Successfully fetched tasks', paginatedResponse);
}
