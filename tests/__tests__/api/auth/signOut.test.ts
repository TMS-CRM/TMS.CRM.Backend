import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/auth/signOut.js';
import { getCognitoClient } from '../../../../lib/aws/cognito.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import type { UserEntry } from '../../../../models/database/userEntry.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';
import { UserEntryBuilder } from '../../../builders/userEntryBuilder.js';

// Mock the getCognitoClient function
vi.mock('../../../../lib/aws/cognito.js', () => ({
  getCognitoClient: vi.fn(),
}));

// Set up the mock client
(getCognitoClient as ReturnType<typeof vi.fn>).mockReturnValue({
  send: vi.fn(),
});

describe('API - Auth - Sign out', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const usersGlobal: UserEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');

    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert([UserEntryBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe8@example.com').build()])
      .returning('*');

    usersGlobal.push(...user);
  });

  it('Success - Should sign out a user', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .withHeader({
        authorization: `Bearer ${randomUUID()}`,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(204);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.message).toBe('User has been signed out successfully');
  });
});
