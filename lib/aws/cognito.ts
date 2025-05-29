import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { User } from '../../models/entities/user.js';
import { updateUser } from '../../repositories/userRepository.js';

let _cognitoIdentityProviderClient: CognitoIdentityProviderClient;

export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!_cognitoIdentityProviderClient) {
    _cognitoIdentityProviderClient = new CognitoIdentityProviderClient({
      endpoint: process.env.AWS_ENDPOINT,
      region: process.env.AWS_REGION,
    });
  }

  return _cognitoIdentityProviderClient;
}

export async function setupCognitoUser(user: User, userPoolId: string): Promise<void> {
  const createUserResponse = await getCognitoClient().send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: user.email,
      UserAttributes: [
        {
          Name: 'email',
          Value: user.email,
        },
      ],
    }),
  );

  // Get the Cognito user ID (sub)
  const cognitoUserUuid = createUserResponse.User?.Attributes?.find((attr) => attr.Name === 'sub')?.Value;

  if (!cognitoUserUuid) {
    throw new Error('Failed to retrieve Cognito user uuid');
  }

  // Update the user with the Cognito user uuid
  await updateUser(user.id, { cognito_uuid: cognitoUserUuid });
}

// export async function createUserPool(poolName: string): Promise<UserPoolType> {
//   const client = getCognitoClient();

//   const response = await client.send(
//     new CreateUserPoolCommand({
//       PoolName: poolName,
//     }),
//   );

//   if (!response.UserPool) {
//     throw new Error('Failed to create Cognito pool');
//   }

//   return response.UserPool;
// }
