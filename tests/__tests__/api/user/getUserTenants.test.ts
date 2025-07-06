import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/user/getUserTenants.js';
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

describe('API - User - GET user tenants', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const usersGlobal: UserDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([
        TenantDatabaseBuilder.make().withName('Tenant 1').build(),
        TenantDatabaseBuilder.make().withName('Tenant 2').build(),
        TenantDatabaseBuilder.make().withName('Tenant 3').withDeletedOn(new Date().toISOString()).build(),
        TenantDatabaseBuilder.make().withName('Tenant 4').build(),
      ])
      .returning('*');
    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert(UserDatabaseBuilder.make().withFirstName('John').withLastName('Doe').withEmail('usertenants@example.com').build())
      .returning('*');
    usersGlobal.push(...user);

    await knexClient(userTenantTableName).insert([
      UserTenantDatabaseBuilder.make().withUserId(usersGlobal[0].id).withTenantId(tenantsGlobal[0].id).build(),
      UserTenantDatabaseBuilder.make().withUserId(usersGlobal[0].id).withTenantId(tenantsGlobal[1].id).build(),
      UserTenantDatabaseBuilder.make().withUserId(usersGlobal[0].id).withTenantId(tenantsGlobal[2].id).build(),
      UserTenantDatabaseBuilder.make()
        .withUserId(usersGlobal[0].id)
        .withTenantId(tenantsGlobal[3].id)
        .withDeletedOn(new Date().toISOString())
        .build(),
    ]);
  });

  it('Success - Should get user tenants', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: usersGlobal[0].external_uuid,
      })
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.length).toBe(2);
    expect(parsedBody.data).toEqual(
      expect.arrayContaining([
        {
          uuid: tenantsGlobal[0].external_uuid,
          name: tenantsGlobal[0].name,
          createdOn: expect.any(String),
          modifiedOn: null,
        },
        {
          uuid: tenantsGlobal[1].external_uuid,
          name: tenantsGlobal[1].name,
          createdOn: expect.any(String),
          modifiedOn: null,
        },
      ]),
    );
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing path parameters: uuid');
  });

  it('Error - Should return a 400 error if the user does not exist', async () => {
    // Event with a random uuid on the path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: randomUUID() })
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('User not found');
  });
});
