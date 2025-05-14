import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { UserEntry } from '../../models/entities/userEntry.js';
import { updateUser } from '../../repositories/userRepository.js';

let _cognitoIdentityProviderClient: CognitoIdentityProviderClient;

export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!_cognitoIdentityProviderClient) {
    _cognitoIdentityProviderClient = new CognitoIdentityProviderClient({
      endpoint: process.env.AWS_ENDPOINT,
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  return _cognitoIdentityProviderClient;
}

export async function setupCognitoUser(user: UserEntry, userPoolId: string): Promise<void> {
  const createUserResponse = await getCognitoClient().send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: user.Email,
      UserAttributes: [
        {
          Name: 'email',
          Value: user.Email,
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
  await updateUser(user.Id, { CognitoUuid: cognitoUserUuid });
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
