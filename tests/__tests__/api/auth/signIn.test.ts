import { handler } from '../../../../lambdas/api/auth/signIn.js';
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

describe('API - Auth - Sign In', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const usersGlobal: UserEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');

    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert([UserEntryBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe6@example.com').build()])
      .returning('*');

    usersGlobal.push(...user);
  });

  it('Success - Should sign in a user', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        email: usersGlobal[0].Email,
        password: 'password',
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

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        password: 'password',
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: email');
  });
});
