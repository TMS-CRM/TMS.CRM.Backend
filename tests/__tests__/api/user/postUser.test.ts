import { handler } from '../../../../lambdas/api/user/postUser.js';
import { getCognitoClient } from '../../../../lib/aws/cognito.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { selectUserByExternalUuid } from '../../../../repositories/userRepository.js';
import { selectUserTenantsByUserId } from '../../../../repositories/userTenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

// Mock the getCognitoClient function
vi.mock('../../../../lib/aws/cognito.js', () => ({
  getCognitoClient: vi.fn(),
}));

// Mock the send method of the client
const mockSend = vi.fn();

// Set up the mock client
(getCognitoClient as ReturnType<typeof vi.fn>).mockReturnValue({
  send: mockSend,
});

describe('API - User - POST', () => {
  const tenantsGlobal: TenantEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);
  });

  beforeEach(() => {
    // Reset the mock before each test
    mockSend.mockReset();
  });

  it('Success - Should create a user', async () => {
    // Arrange: Set up the mock response
    mockSend.mockResolvedValueOnce({
      User: {
        Attributes: [{ Name: 'sub', Value: 'mocked-cognito-uuid' }],
      },
    });

    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
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

    const userTenants = await selectUserTenantsByUserId(user!.Id);
    expect(userTenants).toBeDefined();
    expect(userTenants.length).toBe(1);
    expect(userTenants[0].TenantId).toBe(tenantsGlobal[0].Id);
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        firstName: 'John',
      })
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
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
