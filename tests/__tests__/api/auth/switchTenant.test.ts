import { handler } from '../../../../lambdas/api/auth/switchTenant.js';
import { getCognitoClient } from '../../../../lib/aws/cognito.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import type { UserEntry } from '../../../../models/database/userEntry.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { userTenantTableName } from '../../../../repositories/userTenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';
import { UserEntryBuilder } from '../../../builders/userEntryBuilder.js';
import { UserTenantEntryBuilder } from '../../../builders/userTenantEntryBuilder.js';

// Mock the getCognitoClient function
vi.mock('../../../../lib/aws/cognito.js', () => ({
  getCognitoClient: vi.fn(),
}));

// Mock the send method of the client
const mockSend = vi.fn().mockResolvedValue({
  AuthenticationResult: {
    AccessToken: 'mockAccessToken',
    IdToken: 'mockIdToken',
    RefreshToken: 'mockRefreshToken',
  },
});

// Set up the mock client
(getCognitoClient as ReturnType<typeof vi.fn>).mockReturnValue({
  send: mockSend,
});

describe('API - Auth - Switch Tenant', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const usersGlobal: UserEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([
        TenantEntryBuilder.make().withName('Tenant 1').build(),
        TenantEntryBuilder.make().withName('Tenant 2').build(),
        TenantEntryBuilder.make().withName('Tenant 3').build(),
      ])
      .returning('*');

    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert([UserEntryBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe7@example.com').build()])
      .returning('*');

    usersGlobal.push(...user);

    await knexClient(userTenantTableName).insert([
      UserTenantEntryBuilder.make().withUserId(usersGlobal[0].Id).withTenantId(tenantsGlobal[0].Id).build(),
      UserTenantEntryBuilder.make().withUserId(usersGlobal[0].Id).withTenantId(tenantsGlobal[1].Id).build(),
    ]);
  });

  it('Success - Should switch the user to a new tenant', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims(
        {
          'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
          sub: usersGlobal[0].CognitoUuid,
        },
        true,
      )
      .withPathParameters({
        tenantUuid: tenantsGlobal[1].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.accessToken).toBeDefined();
    expect(parsedBody.data.idToken).toBeDefined();
    expect(parsedBody.data.refreshToken).toBeDefined();
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims(
        {
          'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
          sub: usersGlobal[0].CognitoUuid,
        },
        true,
      )
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing path parameters: tenantUuid');
  });

  it('Error - Should return a 400 error if the user does not have access to the Tenant', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims(
        {
          'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
          sub: usersGlobal[0].CognitoUuid,
        },
        true,
      )
      .withPathParameters({
        tenantUuid: tenantsGlobal[2].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('User does not have access to this tenant');
  });
});
