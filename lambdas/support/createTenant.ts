import type { Knex } from 'knex';
import { setupCognitoUser } from '../../lib/aws/cognito.js';
import { knexClient } from '../../lib/utils/knexClient.js';
import { logger } from '../../lib/utils/logger.js';
import { BadRequestError } from '../../models/api/responses/errors.js';
import { PersistSuccess } from '../../models/api/responses/success.js';
import { Tenant } from '../../models/entities/tenant.js';
import { User, type UserDatabase } from '../../models/entities/user.js';
import { UserTenant } from '../../models/entities/userTenant.js';
import type { CreateTenantRequestPayload, CreateTenantResponsePayload, CreateTenantResultKeys } from '../../models/support/tenant.js';
import { insertTenant, selectTenantById } from '../../repositories/tenantRepository.js';
import { insertUser, selectUserByEmail, selectUserById } from '../../repositories/userRepository.js';
import { insertUserTenant } from '../../repositories/userTenantRepository.js';

const USER_POOL_ID = process.env.USER_POOL_ID;

/**
 * Support lambda to create a new tenant and a first user
 * @param request - The request payload
 * @returns The response payload
 */
export async function handler(request: CreateTenantRequestPayload): Promise<PersistSuccess<CreateTenantResponsePayload>> {
  logger.info('Request received: ', request);

  const transaction = await knexClient.transaction();

  return validateRequest(request)
    .then((request) => createTenantAndUser(request, transaction))
    .then((payload) => createCognitoUser(payload, transaction))
    .then(async (response) => {
      await transaction.commit();
      return response;
    })
    .then(formatResponseData)
    .catch(async (error: Error) => {
      logger.error('Error creating tenant and user, rolling back transaction.', error);
      await transaction.rollback();
      throw error;
    });
}

async function validateRequest(request: CreateTenantRequestPayload): Promise<CreateTenantRequestPayload> {
  logger.info('Start - validateRequest');

  if (!request.name || !request.user || !request.user.email) {
    throw new BadRequestError('Tenant name and user email are required');
  }

  const user = await selectUserByEmail(request.user.email);
  if (user) {
    throw new BadRequestError('This email is already associated with an user');
  }

  return request;
}

async function createTenantAndUser(request: CreateTenantRequestPayload, transaction: Knex.Transaction): Promise<CreateTenantResultKeys> {
  logger.info('Start - createTenant');

  // Create tenant
  const tenantId = await insertTenant(Tenant.create(request.name), transaction);

  // Create user
  const mappedUser: Partial<UserDatabase> = User.create({
    email: request.user.email,
    firstName: request.user.firstName,
    lastName: request.user.lastName,
  });
  const userId = await insertUser(mappedUser, transaction);

  // Link user to tenant
  await insertUserTenant(UserTenant.create(userId, tenantId), transaction);

  return { newTenantId: tenantId, newUserId: userId };
}

async function createCognitoUser(payload: CreateTenantResultKeys, transaction: Knex.Transaction): Promise<CreateTenantResultKeys> {
  logger.info('Start - createCognitoUser');

  // Create Cognito user
  const user = await selectUserById(payload.newUserId, transaction);

  if (!user) {
    throw new BadRequestError('User not found');
  }

  await setupCognitoUser(user, USER_POOL_ID!, transaction);

  return payload;
}

export async function formatResponseData(payload: CreateTenantResultKeys): Promise<PersistSuccess<CreateTenantResponsePayload>> {
  logger.info('Start - formatResponse');

  const tenant = (await selectTenantById(payload.newTenantId))!.toPublic();
  const user = (await selectUserById(payload.newUserId))!.toPublic();

  return new PersistSuccess<CreateTenantResponsePayload>('Successfully created tenant', {
    tenant,
    user,
  });
}
