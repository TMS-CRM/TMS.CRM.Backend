import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { validateAndParseBody, validateAndParseQueryParams } from '../../../lib/utils/apiValidations.js';
import { logger } from '../../../lib/utils/logger.js';
import { type PostUserRequestPayload, type PostUserResponsePayload, postUserRequestSchema } from '../../../models/api/payloads/user.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import type { ValidatedAPIRequest } from '../../../models/api/validations.js';
import { QueryParamDataType } from '../../../models/api/validations.js';
import { UserEntry } from '../../../models/database/userEntry.js';
import { insertUser, selectUserById } from '../../../repositories/userRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedAPIRequest<PostUserRequestPayload>> {
  logger.info('Start - validateRequest');

  const parsedRequestBody = validateAndParseBody<PostUserRequestPayload>(request, postUserRequestSchema);

  // TODO: Pull tenantId and userId from the token
  const eventQueryParams = validateAndParseQueryParams<{ tenantId: number }>(request, [
    { name: 'tenantId', dataType: QueryParamDataType.number, required: true },
  ]);

  return { tenantId: eventQueryParams.tenantId, userId: null, payload: parsedRequestBody };
}

export async function persistRecords(validatedRequest: ValidatedAPIRequest<PostUserRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const mappedUser: Partial<UserEntry> = UserEntry.fromPostRequestPayload(validatedRequest.payload);
  const userId = await insertUser(mappedUser);

  // TODO: Create a link between the user and the tenant
  return userId;
}

export async function formatResponseData(userId: number): Promise<PersistSuccess<PostUserResponsePayload>> {
  logger.info('Start - formatResponse');

  const user = await selectUserById(userId);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  return new PersistSuccess<PostUserResponsePayload>('User has been created', user.toPublic());
}
