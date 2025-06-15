import type { PreTokenGenerationV2TriggerEvent } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { selectTenantById } from '../../../repositories/tenantRepository.js';
import { selectUserByCognitoUuid } from '../../../repositories/userRepository.js';
import { selectUserTenantsByUserId } from '../../../repositories/userTenantRepository.js';

/**
 * This lambda function is triggered before the token generation process.
 * It is used to add a custom claim (tenantUuid) to the user's JWT token.
 *
 * @see https://aws.amazon.com/blogs/security/how-to-customize-access-tokens-in-amazon-cognito-user-pools/
 */
export async function handler(event: PreTokenGenerationV2TriggerEvent): Promise<PreTokenGenerationV2TriggerEvent> {
  logger.info('Request received: ', event);

  return determineTenantUuid(event)
    .then(formatResponse)
    .catch((error: Error) => {
      logger.info(error);
      throw error;
    });
}

async function determineTenantUuid(
  event: PreTokenGenerationV2TriggerEvent,
): Promise<{ event: PreTokenGenerationV2TriggerEvent; tenantUuid: string }> {
  logger.info('Start - determineTenantUuid');

  // Check if a preferred tenant uuid is provided
  // This is used when the user switches tenants or refreshes the token
  const preferredTenantUuid = event.request.clientMetadata?.preferredTenantUuid;
  if (preferredTenantUuid) {
    return {
      event,
      tenantUuid: preferredTenantUuid,
    };
  }

  // If no preferred tenant uuid is provided, use the first available tenant for the user
  const userCognitoId = event.request.userAttributes.sub;

  const user = await selectUserByCognitoUuid(userCognitoId);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  const userTenants = await selectUserTenantsByUserId(user.id);
  if (!userTenants?.length) {
    throw new BadRequestError('User has no tenants');
  }

  const tenant = await selectTenantById(userTenants[0].tenantId);
  if (!tenant) {
    throw new BadRequestError('Tenant not found');
  }

  return {
    event,
    tenantUuid: tenant.externalUuid,
  };
}

function formatResponse(payload: { event: PreTokenGenerationV2TriggerEvent; tenantUuid: string }): PreTokenGenerationV2TriggerEvent {
  logger.info('Start - formatResponse');

  // Add the tenantId as a custom claim
  payload.event.response.claimsAndScopeOverrideDetails = {
    ...payload.event.response.claimsAndScopeOverrideDetails,
    accessTokenGeneration: {
      ...(payload.event.response.claimsAndScopeOverrideDetails?.accessTokenGeneration ?? {}),
      claimsToAddOrOverride: {
        tenantUuid: payload.tenantUuid,
      },
    },
  };

  return payload.event;
}
