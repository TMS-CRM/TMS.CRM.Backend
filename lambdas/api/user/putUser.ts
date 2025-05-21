import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { type PutUserRequestPayload, type PutUserResponsePayload, putUserRequestSchema } from '../../../models/api/payloads/user.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { User, type UserDatabase } from '../../../models/entities/user.js';
import { selectUserByExternalUuid, selectUserById, updateUser } from '../../../repositories/userRepository.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PutUserRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PutUserRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: putUserRequestSchema,
    expectedPathParameter: 'uuid',
  });
}

export async function persistRecords(validatedRequest: ValidatedApiRequest<PutUserRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  // Validate the user exists
  const user = await selectUserByExternalUuid(validatedRequest.pathParameter!);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  // Update the user
  const mappedUser: Partial<UserDatabase> = User.update(validatedRequest.body!);
  await updateUser(user.id, mappedUser);

  return user.id;
}

export async function formatResponseData(userId: number): Promise<PersistSuccess<PutUserResponsePayload>> {
  logger.info('Start - formatResponse');

  const user = await selectUserById(userId);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  return new PersistSuccess<PutUserResponsePayload>('User has been updated', user.toPublic());
}
