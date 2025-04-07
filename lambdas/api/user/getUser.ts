import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { validateAndParsePathParams, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { selectUserByExternalUuid } from '../../../repositories/userRepository.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import type { GetUserResponsePayload } from '../../../models/api/payloads/user.js';
import type { UserEntry } from '../../../models/database/userEntry.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(queryRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error) => new HttpErrorResponse(error));
}

async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<null>> {
  logger.info('Start - validateRequest');

  const parsedPathParameter = validateAndParsePathParams<{ [param: string]: string }>(request, ['uuid']);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: null, pathParameter: parsedPathParameter.uuid };
}

export async function queryRecords(validatedRequest: ValidatedAPIRequest<null>): Promise<UserEntry> {
  logger.info('Start - queryRecords');

  // Validate the user exists
  const user = await selectUserByExternalUuid(validatedRequest.pathParameter!);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  return user;
}

export async function formatResponseData(user: UserEntry): Promise<FetchSuccess<GetUserResponsePayload>> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<GetUserResponsePayload>('Successfully fetched user', user.toPublic());
}
