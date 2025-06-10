import { handler } from '../../../../lambdas/api/auth/refreshToken.js';
import { getCognitoClient } from '../../../../lib/aws/cognito.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import type { UserDatabase } from '../../../../models/entities/user.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';
import { UserDatabaseBuilder } from '../../../builders/userDatabaseBuilder.js';

// Mock the getCognitoClient function
vi.mock('../../../../lib/aws/cognito.js', () => ({
  getCognitoClient: vi.fn(),
}));

// Mock the send method of the client
const mockSend = vi.fn().mockResolvedValue({
  AuthenticationResult: {
    AccessToken: 'mockAccessToken',
    IdToken: 'mockIdToken',
  },
});

// Set up the mock client
(getCognitoClient as ReturnType<typeof vi.fn>).mockReturnValue({
  send: mockSend,
});

describe('API - Auth - Refresh token', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const usersGlobal: UserDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');

    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert([UserDatabaseBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe10@example.com').build()])
      .returning('*');

    usersGlobal.push(...user);
  });

  it('Success - Should refresh the token', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims(
        {
          'custom:tenantUuid': tenantsGlobal[0].external_uuid,
          sub: usersGlobal[0].cognito_uuid,
        },
        true,
      )
      .withBody({
        refreshToken: 'refreshToken',
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.accessToken).toBeDefined();
    expect(parsedBody.data.idToken).toBeDefined();
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims(
        {
          'custom:tenantUuid': tenantsGlobal[0].external_uuid,
          sub: usersGlobal[0].cognito_uuid,
        },
        true,
      )
      .withBody({})
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: refreshToken');
  });
});
