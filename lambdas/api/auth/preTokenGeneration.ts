import type { PreTokenGenerationV2TriggerEvent } from 'aws-lambda';
import { logger } from '../../../lib/utils/logger.js';
import { BadRequestError } from '../../../models/api/responses/errors.js';
import { selectTenantById } from '../../../repositories/tenantRepository.js';
import { selectUserByCognitoUuid } from '../../../repositories/userRepository.js';
import { selectUserMostRecentTenant } from '../../../repositories/userTenantRepository.js';

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

  const userCognitoId = event.request.userAttributes.sub;
  const user = await selectUserByCognitoUuid(userCognitoId);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  // TEMP: Since we can't inject a preferred tenant uuid into the token generation process,
  // we need to use the most recent tenant that the user has requested to authenticate with.
  // This can lead to race conditions if the user refreshes the token in multiple devices at the same time.
  const userMostRecentTenant = await selectUserMostRecentTenant(user.id);

  const tenant = await selectTenantById(userMostRecentTenant!.tenantId);
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
