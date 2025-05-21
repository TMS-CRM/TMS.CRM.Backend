import { handler } from '../../../lambdas/support/createTenant.js';
import { setupCognitoUser } from '../../../lib/aws/cognito.js';
import type { CreateTenantRequestPayload } from '../../../models/support/tenant.js';
import { selectUserByExternalUuid } from '../../../repositories/userRepository.js';
import { selectUserTenantsByUserId } from '../../../repositories/userTenantRepository.js';

// Mock the setupCognitoUser function
vi.mock('../../../lib/aws/cognito.js', () => ({
  setupCognitoUser: vi.fn(),
}));

// Set up the mock for setupCognitoUser
const mockSetupCognitoUser = setupCognitoUser as ReturnType<typeof vi.fn>;

describe('SUPPORT - Create Tenant', () => {
  it('Success - Should create a tenant and user', async () => {
    const payload: CreateTenantRequestPayload = {
      name: 'New Tenant',
      user: {
        firstName: 'New',
        lastName: 'User',
        email: 'new.user@example.com',
      },
    };

    // Run the handler
    const res = await handler(payload);

    // Validate the API response
    expect(res.type).toBe('PersistSuccess');
    expect(res.data).toBeDefined();

    // Validate the database records
    const user = await selectUserByExternalUuid(res.data!.user.uuid);
    expect(user).toBeDefined();

    const userTenants = await selectUserTenantsByUserId(user!.id);
    expect(userTenants).toBeDefined();
    expect(userTenants!.length).toBe(1);

    // Verify that setupCognitoUser was called
    expect(mockSetupCognitoUser).toHaveBeenCalled();
  });
});
