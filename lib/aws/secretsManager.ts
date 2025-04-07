/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { CreateSecretCommandInput } from '@aws-sdk/client-secrets-manager';
import { CreateSecretCommand, DeleteSecretCommand, GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

let _secretsManagerClient: SecretsManagerClient;

// Store AWS secrets
const secretsMap = new Map<string, string>();

// Initialize AWS clients
function secretsManagerClient(): SecretsManagerClient {
  if (!_secretsManagerClient) {
    _secretsManagerClient = new SecretsManagerClient({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT,
    });
  }

  return _secretsManagerClient;
}

/** Return secret from AWS Secrets manager */
export async function getSecret(secretId: string): Promise<string | null> {
  if (!secretsMap.has(secretId)) {
    const command: GetSecretValueCommand = new GetSecretValueCommand({
      SecretId: secretId,
    });

    await secretsManagerClient()
      .send(command)
      .then((secret) => secretsMap.set(secretId, secret.SecretString!));
  }

  return secretsMap.get(secretId) ?? null;
}

/** Store a secret in AWS secretsmanager. Allow for overriding a current secret value */
export async function createSecret(params: CreateSecretCommandInput, overwrite: boolean = false): Promise<string | undefined> {
  if (overwrite) {
    const command: DeleteSecretCommand = new DeleteSecretCommand({
      ForceDeleteWithoutRecovery: true,
      SecretId: params.Name,
    });

    await secretsManagerClient()
      .send(command)
      .catch((error) => {
        if (error.code !== 'ResourceNotFoundException') {
          throw error;
        }
      });
  }

  const command: CreateSecretCommand = new CreateSecretCommand(params);

  return secretsManagerClient()
    .send(command)
    .then((res) => res.ARN);
}
