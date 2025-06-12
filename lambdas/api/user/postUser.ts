import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { Knex } from 'knex';
import { setupCognitoUser } from '../../../lib/aws/cognito.js';
import { knexClient } from '../../../lib/utils/knexClient.js';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import { type PostUserRequestPayload, type PostUserResponsePayload, postUserRequestSchema } from '../../../models/api/payloads/user.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { HttpOkResponse, PersistSuccess } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';
import { User, type UserDatabase } from '../../../models/entities/user.js';
import { UserTenant } from '../../../models/entities/userTenant.js';
import { selectTenantByExternalUuid } from '../../../repositories/tenantRepository.js';
import { insertUser, selectUserById } from '../../../repositories/userRepository.js';
import { insertUserTenant } from '../../../repositories/userTenantRepository.js';

const USER_POOL_ID = process.env.USER_POOL_ID;

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  const transaction = await knexClient.transaction();

  return validateRequest(request)
    .then((request) => persistRecords(request, transaction))
    .then((userId) => createCognitoUser(userId, transaction))
    .then(async (response) => {
      await transaction.commit();
      return response;
    })
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(async (error: Error) => {
      await transaction.rollback();
      return toHttpErrorResponse(error);
    });
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<PostUserRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<PostUserRequestPayload>({
    request,
    expectAccessToken: true,
    expectedBodySchema: postUserRequestSchema,
  });
}

async function persistRecords(validatedRequest: ValidatedApiRequest<PostUserRequestPayload>, transaction: Knex.Transaction): Promise<number> {
  logger.info('Start - persistRecords');

  const tenant = await selectTenantByExternalUuid(validatedRequest.tenantUuid!);
  if (!tenant) {
    throw new BadRequestError('Tenant not found');
  }

  const mappedUser: Partial<UserDatabase> = User.create(validatedRequest.body!);
  const userId = await insertUser(mappedUser, transaction);

  // Create a link between the user and the tenant
  await insertUserTenant(UserTenant.create(userId, tenant.id), transaction);

  return userId;
}

async function createCognitoUser(userId: number, transaction: Knex.Transaction): Promise<number> {
  logger.info('Start - createCognitoUser');

  const user = await selectUserById(userId, transaction);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  await setupCognitoUser(user, USER_POOL_ID!, transaction);

  return user.id;
}

async function formatResponseData(userId: number): Promise<PersistSuccess<PostUserResponsePayload>> {
  logger.info('Start - formatResponse');

  const user = await selectUserById(userId);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  return new PersistSuccess<PostUserResponsePayload>('User has been created', user.toPublic());
}
