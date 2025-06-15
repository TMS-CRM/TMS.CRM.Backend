import { handler } from '../../../../lambdas/api/auth/switchTenant.js';
import { getCognitoClient } from '../../../../lib/aws/cognito.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import type { UserDatabase } from '../../../../models/entities/user.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { userTenantTableName } from '../../../../repositories/userTenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';
import { UserDatabaseBuilder } from '../../../builders/userDatabaseBuilder.js';
import { UserTenantDatabaseBuilder } from '../../../builders/userTenantDatabaseBuilder.js';

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

describe('API - Auth - Switch Tenant', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const usersGlobal: UserDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([
        TenantDatabaseBuilder.make().withName('Tenant 1').build(),
        TenantDatabaseBuilder.make().withName('Tenant 2').build(),
        TenantDatabaseBuilder.make().withName('Tenant 3').build(),
      ])
      .returning('*');

    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert([UserDatabaseBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe7@example.com').build()])
      .returning('*');

    usersGlobal.push(...user);

    await knexClient(userTenantTableName).insert([
      UserTenantDatabaseBuilder.make().withUserId(usersGlobal[0].id).withTenantId(tenantsGlobal[0].id).build(),
      UserTenantDatabaseBuilder.make().withUserId(usersGlobal[0].id).withTenantId(tenantsGlobal[1].id).build(),
    ]);
  });

  it('Success - Should switch the user to a new tenant', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .withBody({
        tenantUuid: tenantsGlobal[1].external_uuid,
      })
      .withHeaders({
        'refresh-token': 'mockRefreshToken',
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
  });

  it('Error - Should return a 400 error if the body is missing', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .withHeaders({
        'refresh-token': 'mockRefreshToken',
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Request body not found');
  });

  it('Error - Should return a 400 error if the user does not have access to the Tenant', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .withBody({
        tenantUuid: tenantsGlobal[2].external_uuid,
      })
      .withHeaders({
        'refresh-token': 'mockRefreshToken',
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
