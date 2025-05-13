import type { PreAuthenticationTriggerEvent } from 'aws-lambda/trigger/cognito-user-pool-trigger/pre-authentication.js';
import { logger } from '../../../lib/utils/logger.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { selectTenantById } from '../../../repositories/tenantRepository.js';
import { selectUserByCognitoUuid } from '../../../repositories/userRepository.js';
import { selectUserTenantsByUserId } from '../../../repositories/userTenantRepository.js';

/**
 * This lambda function is triggered before the authentication process.
 * It is used to add a custom claim (tenantUuid) to the user's JWT token.
 *
 * @see https://aws.amazon.com/blogs/security/how-to-customize-access-tokens-in-amazon-cognito-user-pools/
 */

export async function handler(event: PreAuthenticationTriggerEvent): Promise<PreAuthenticationTriggerEvent> {
  logger.info('Request received: ', event);

  return determineTenantUuid(event)
    .then(formatResponse)
    .catch((error: Error) => {
      logger.error(error);
      throw error;
    });
}

async function determineTenantUuid(event: PreAuthenticationTriggerEvent): Promise<{ event: PreAuthenticationTriggerEvent; tenantUuid: string }> {
  logger.info('Start - determineTenantUuid');

  // If a preferred tenant uuid is provided, use it
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

  const userTenants = await selectUserTenantsByUserId(user.Id);
  if (!userTenants.length) {
    throw new BadRequestError('User has no tenants');
  }

  const tenant = await selectTenantById(userTenants[0].TenantId);
  if (!tenant) {
    throw new BadRequestError('Tenant not found');
  }

  return {
    event,
    tenantUuid: tenant.ExternalUuid,
  };
}

function formatResponse(payload: { event: PreAuthenticationTriggerEvent; tenantUuid: string }): PreAuthenticationTriggerEvent {
  logger.info('Start - formatResponse');

  // Add the tenantId as a custom claim
  payload.event.response = {
    claimsAndScopeOverrideDetails: {
      idTokenGeneration: {},
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          'custom:tenantUuid': payload.tenantUuid,
        },
      },
    },
  };

  return payload.event;
}
