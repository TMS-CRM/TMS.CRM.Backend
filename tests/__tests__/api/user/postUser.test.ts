import { handler } from '../../../../lambdas/api/user/postUser.js';
import { setupCognitoUser } from '../../../../lib/aws/cognito.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { selectUserByExternalUuid } from '../../../../repositories/userRepository.js';
import { selectUserTenantsByUserId } from '../../../../repositories/userTenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';

// Mock the setupCognitoUser function
vi.mock('../../../../lib/aws/cognito.js', () => ({
  setupCognitoUser: vi.fn(),
}));

// Set up the mock for setupCognitoUser
const mockSetupCognitoUser = setupCognitoUser as ReturnType<typeof vi.fn>;

describe('API - User - POST', () => {
  const tenantsGlobal: TenantDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);
  });

  it('Success - Should create a user', async () => {
    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.firstName).toBe(payload.firstName);
    expect(parsedBody.data.lastName).toBe(payload.lastName);
    expect(parsedBody.data.email).toBe(payload.email);
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeNull();

    // Validate the database records
    const user = await selectUserByExternalUuid(parsedBody.data.uuid);
    expect(user).toBeDefined();

    const userTenants = await selectUserTenantsByUserId(user!.id);
    expect(userTenants).toBeDefined();
    expect(userTenants.length).toBe(1);
    expect(userTenants[0].tenantId).toBe(tenantsGlobal[0].id);

    // Verify that setupCognitoUser was called
    expect(mockSetupCognitoUser).toHaveBeenCalled();
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        firstName: 'John',
      })
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: lastName, email');
  });
});
