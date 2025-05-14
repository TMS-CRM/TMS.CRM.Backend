import { setupCognitoUser } from '../../lib/aws/cognito.js';
import { logger } from '../../lib/utils/logger.js';
import { BadRequestError } from '../../models/api/responses/errors.js';
import { PersistSuccess } from '../../models/api/responses/success.js';
import { Tenant } from '../../models/entities/tenantEntry.js';
import { UserEntry } from '../../models/entities/userEntry.js';
import { UserTenantEntry } from '../../models/entities/userTenantEntry.js';
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

  return validateRequest(request).then(createTenantAndUser).then(createCognitoUser).then(formatResponseData);
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

async function createTenantAndUser(request: CreateTenantRequestPayload): Promise<CreateTenantResultKeys> {
  logger.info('Start - createTenant');

  // Create tenant
  const tenantId = await insertTenant(Tenant.create(request.name));

  // Create user
  const mappedUser: Partial<UserEntry> = UserEntry.fromPostRequestPayload({
    email: request.user.email,
    firstName: request.user.firstName,
    lastName: request.user.lastName,
  });
  const userId = await insertUser(mappedUser);

  // Link user to tenant
  await insertUserTenant(UserTenantEntry.create(userId, tenantId));

  return { newTenantId: tenantId, newUserId: userId };
}

async function createCognitoUser(payload: CreateTenantResultKeys): Promise<CreateTenantResultKeys> {
  logger.info('Start - createCognitoUser');

  // Create Cognito user
  const user = await selectUserById(payload.newUserId);
  await setupCognitoUser(user!, USER_POOL_ID!);

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
