import { GlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getCognitoClient } from '../../../lib/aws/cognito.js';
import { logger } from '../../../lib/utils/logger.js';
import { BadRequestError, HttpErrorResponse } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received: ', request);

  return validateRequest(request)
    .then(signOutUser)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch((error: Error) => new HttpErrorResponse(error));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<null>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest({
    request,
    expectedAuthenticated: true,
  });
}

async function signOutUser(validatedRequest: ValidatedApiRequest<null>): Promise<void> {
  logger.info('Start - signOutUser');

  if (!validatedRequest.accessToken) {
    throw new BadRequestError('Access token not found');
  }

  // Sign out the current access token
  const signOutCommand = new GlobalSignOutCommand({
    AccessToken: validatedRequest.accessToken,
  });

  await getCognitoClient().send(signOutCommand);
}

function formatResponseData(): FetchSuccess<null> {
  logger.info('Start - formatResponse');

  return new FetchSuccess<null>('User has been signed out successfully', null);
}
