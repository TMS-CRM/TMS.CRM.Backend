import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import type { GetTaskListFilter, GetTaskListResponsePayload, PublicTask } from '../../../models/api/payloads/task.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { PaginatedResponse } from '../../../models/api/responses/pagination.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { QueryParamDataType, ValidatedApiRequest } from '../../../models/api/validations.js';
import type { Task } from '../../../models/entities/task.js';
import { selectTasks } from '../../../repositories/taskRepository.js';
import { selectTenantByExternalUuid } from '../../../repositories/tenantRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null, GetTaskListFilter>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<null, GetTaskListFilter>({
    request,
    expectedAuthenticated: true,
    expectedQueryParameters: [
      { name: 'limit', dataType: QueryParamDataType.number, required: true },
      { name: 'offset', dataType: QueryParamDataType.number, required: true },
    ],
  });
}

export async function queryRecords(validatedRequest: ValidatedApiRequest<null, GetTaskListFilter>): Promise<PaginatedResponse<Task>> {
  logger.info('Start - queryRecords');

  const tenant = await selectTenantByExternalUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant does not exist');
  }

  const { limit, offset } = validatedRequest.queryParameters!;
  const queryResult: PaginatedResponse<Task> = await selectTasks(limit, offset, tenant.id);

  return queryResult;
}

export function formatResponseData(queryResult: PaginatedResponse<Task>): FetchSuccess<GetTaskListResponsePayload> {
  logger.info('Start - formatResponse');

  const paginatedResponse: PaginatedResponse<PublicTask> = {
    items: queryResult.items.map((task) => task.toPublic()),
    total: queryResult.total,
  };

  return new FetchSuccess<GetTaskListResponsePayload>('Successfully fetched tasks', paginatedResponse);
}
