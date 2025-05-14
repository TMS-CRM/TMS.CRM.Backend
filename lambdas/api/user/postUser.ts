import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { setupCognitoUser } from '../../../lib/aws/cognito.js';
import { logger } from '../../../lib/utils/logger.js';
import { type PostUserRequestPayload, type PostUserResponsePayload, postUserRequestSchema } from '../../../models/api/payloads/user.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { UserEntry } from '../../../models/entities/userEntry.js';
import { UserTenantEntry } from '../../../models/entities/userTenantEntry.js';
import { selectTenantByUuid } from '../../../repositories/tenantRepository.js';
import { insertUser, selectUserById } from '../../../repositories/userRepository.js';
import { insertUserTenant } from '../../../repositories/userTenantRepository.js';

const USER_POOL_ID = process.env.USER_POOL_ID;

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(persistRecords)
    .then(createCognitoUser)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PostUserRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PostUserRequestPayload>({
    request,
    expectedAuthenticated: true,
    expectedBodySchema: postUserRequestSchema,
  });
}

async function persistRecords(validatedRequest: ValidatedApiRequest<PostUserRequestPayload>): Promise<number> {
  logger.info('Start - persistRecords');

  const tenant = await selectTenantByUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant not found');
  }

  const mappedUser: Partial<UserEntry> = UserEntry.fromPostRequestPayload(validatedRequest.body!);
  const userId = await insertUser(mappedUser);

  // Create a link between the user and the tenant
  await insertUserTenant(UserTenantEntry.create(userId, tenant.Id));

  return userId;
}

async function createCognitoUser(userId: number): Promise<number> {
  logger.info('Start - createCognitoUser');

  const user = await selectUserById(userId);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  await setupCognitoUser(user, USER_POOL_ID!);

  return user.Id;
}

async function formatResponseData(userId: number): Promise<PersistSuccess<PostUserResponsePayload>> {
  logger.info('Start - formatResponse');

  const user = await selectUserById(userId);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  return new PersistSuccess<PostUserResponsePayload>('User has been created', user.toPublic());
}
