import { AdminInitiateAuthCommand, AuthFlowType, type AuthenticationResultType, ChallengeNameType } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getCognitoClient } from '../../../lib/aws/cognito.js';
import { logger } from '../../../lib/utils/logger.js';
import { toHttpErrorResponse } from '../../../lib/utils/response.js';
import type { SignInForbiddenResponsePayload, SignInRequestPayload, SignInResponsePayload } from '../../../models/api/payloads/auth/signIn.js';
import { signInRequestSchema } from '../../../models/api/payloads/auth/signIn.js';
import { BadRequestError, ForbiddenError } from '../../../models/api/responses/errors.js';
import { FetchSuccess, HttpOkResponse } from '../../../models/api/responses/success.js';
import { ValidatedApiRequest } from '../../../models/api/validations.js';

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export async function handler(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info('Request received');

  return validateRequest(request)
    .then(authenticateUser)
    .then(formatResponseData)
    .then((response) => new HttpOkResponse(response))
    .catch(toHttpErrorResponse);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function validateRequest(request: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ValidatedApiRequest<SignInRequestPayload>> {
  logger.info('Start - validateRequest');

  return new ValidatedApiRequest<SignInRequestPayload>({
    request,
    expectedAuthenticated: false,
    expectedBodySchema: signInRequestSchema,
  });
}

async function authenticateUser(validatedRequest: ValidatedApiRequest<SignInRequestPayload>): Promise<AuthenticationResultType> {
  logger.info('Start - authenticateUser');

  const { email, password } = validatedRequest.body!;

  const response = await getCognitoClient().send(
    new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH, // For direct authentication with email and password.
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  );

  if (response.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
    logger.info(`New password required for user ${email}`);

    throw new ForbiddenError<SignInForbiddenResponsePayload>('New password required', {
      email: email,
      session: response.Session!,
    });
  }

  if (!response.AuthenticationResult) {
    throw new BadRequestError('Authentication failed');
  }

  return response.AuthenticationResult;
}

function formatResponseData(authenticationResult: AuthenticationResultType): FetchSuccess<SignInResponsePayload> {
  logger.info('Start - formatResponse');

  const responsePayload: SignInResponsePayload = {
    accessToken: authenticationResult.AccessToken!,
    idToken: authenticationResult.IdToken!,
    refreshToken: authenticationResult.RefreshToken!,
  };

  return new FetchSuccess<SignInResponsePayload>('User has been authenticated', responsePayload);
}
