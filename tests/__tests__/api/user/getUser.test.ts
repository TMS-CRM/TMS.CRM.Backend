import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/user/getUser.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import type { UserDatabase } from '../../../../models/entities/user.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';
import { UserDatabaseBuilder } from '../../../builders/userDatabaseBuilder.js';

describe('API - User - GET', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const usersGlobal: UserDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const user = await knexClient(userTableName)
      .insert([
        UserDatabaseBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe2@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Jane').withLastName('Paul').withEmail('jane.paul1@example.com').build(),
      ])
      .returning('*');
    usersGlobal.push(...user);
  });

  it('Success - Should get a user', async () => {
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
    expect(parsedBody.data.firstName).toBe(usersGlobal[0].first_name);
    expect(parsedBody.data.lastName).toBe(usersGlobal[0].last_name);
    expect(parsedBody.data.email).toBe(usersGlobal[0].email);
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();
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
