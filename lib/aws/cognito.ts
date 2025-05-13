import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

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
