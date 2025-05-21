import type { PreAuthenticationTriggerEvent } from 'aws-lambda/trigger/cognito-user-pool-trigger/pre-authentication.js';
import { handler } from '../../../../lambdas/api/auth/preAuthentication.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import type { UserDatabase } from '../../../../models/entities/user.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { userTenantTableName } from '../../../../repositories/userTenantRepository.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';
import { UserDatabaseBuilder } from '../../../builders/userDatabaseBuilder.js';
import { UserTenantDatabaseBuilder } from '../../../builders/userTenantDatabaseBuilder.js';

describe('API - Auth - PreAuthentication', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const usersGlobal: UserDatabase[] = [];

  beforeAll(async () => {
    // Insert a tenant and a user into the database
    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert(
        UserDatabaseBuilder.make()
          .withFirstName('John')
          .withLastName('Doe')
          .withEmail('john.doe5@example.com')
          .withCognitoUuid('mocked-cognito-uuid2')
          .build(),
      )
      .returning('*');
    usersGlobal.push(...user);

    // Link the user to the tenant
    await knexClient(userTenantTableName).insert([
      UserTenantDatabaseBuilder.make().withUserId(usersGlobal[0].id).withTenantId(tenantsGlobal[0].id).build(),
    ]);
  });

  it('Success - Should add tenantUuid to claims', async () => {
    const event: PreAuthenticationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_example',
      triggerSource: 'PreAuthentication_Authentication',
      userName: 'exampleUser',
      callerContext: {
        awsSdkVersion: '1',
        clientId: 'exampleClientId',
      },
      request: {
        userAttributes: {
          sub: usersGlobal[0].cognito_uuid,
        },
      },
      response: {},
    };

    const result = await handler(event);

    expect(result.response).toEqual({
      claimsAndScopeOverrideDetails: {
        idTokenGeneration: {},
        accessTokenGeneration: {
          claimsToAddOrOverride: {
            'custom:tenantUuid': tenantsGlobal[0].external_uuid,
          },
        },
      },
    });
  });
});
