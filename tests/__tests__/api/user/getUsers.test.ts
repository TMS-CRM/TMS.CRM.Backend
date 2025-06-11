import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/user/getUsers.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { userTenantTableName } from '../../../../repositories/userTenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';
import { UserDatabaseBuilder } from '../../../builders/userDatabaseBuilder.js';
import { UserTenantDatabaseBuilder } from '../../../builders/userTenantDatabaseBuilder.js';

describe('API - User - GET', () => {
  const tenantsGlobal: TenantDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([
        TenantDatabaseBuilder.make().withName('Tenant 1').build(),
        TenantDatabaseBuilder.make().withName('Tenant 2').build(),
        TenantDatabaseBuilder.make().withName('Tenant 3').build(),
      ])
      .returning('*');
    tenantsGlobal.push(...tenant);

    // Insert 9 users and link them to the first tenant
    const firstTenantUsers = await knexClient(userTableName)
      .insert([
        UserDatabaseBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe3@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Jane').withLastName('Paul').withEmail('jane.paul2@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Marcus').withLastName('Aurelius').withEmail('marcus.aurelius1@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Junior').withLastName('Santos').withEmail('junior.santos1@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Natalia').withLastName('Pontes').withEmail('natalia.pontes1@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Elena').withLastName('Rodriguez').withEmail('elena.rodriguez1@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Kai').withLastName('Chen').withEmail('kai.chen1@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Sofia').withLastName('Patel').withEmail('sofia.patel1@example.com').build(),
        UserDatabaseBuilder.make().withFirstName('Lucas').withLastName('Nielsen').withEmail('lucas.nielsen1@example.com').build(),
      ])
      .returning('id');

    await knexClient(userTenantTableName).insert(
      firstTenantUsers.map((user) => UserTenantDatabaseBuilder.make().withUserId(user.id).withTenantId(tenantsGlobal[0].id).build()),
    );

    // Create a user and link it to the second tenant
    const secondTenantUsers = await knexClient(userTableName)
      .insert([UserDatabaseBuilder.make().withFirstName('Paulo').withLastName('Albuquerque').withEmail('paulo.albuquerque1@example.com').build()])
      .returning('id');

    await knexClient(userTenantTableName).insert([
      UserTenantDatabaseBuilder.make().withUserId(secondTenantUsers[0].id).withTenantId(tenantsGlobal[1].id).build(),
    ]);
  });

  it('Success - Should get users with pagination', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[0].external_uuid,
      })
      .withQueryStringParameters({
        limit: '5',
        offset: '0',
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.items).toBeDefined();
    expect(parsedBody.data.items.length).toBe(5);
    expect(parsedBody.data.total).toBe(9);
  });

  it('Success - Should get users with pagination using offset', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[0].external_uuid,
      })
      .withQueryStringParameters({
        limit: '5',
        offset: '5',
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.items).toBeDefined();
    expect(parsedBody.data.items.length).toBe(4); // Exclude the first 5 users
    expect(parsedBody.data.total).toBe(9); // Total number of users should still be 9
  });

  it('Success - Should return 0 users if the tenant has no users', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[2].external_uuid,
      })
      .withQueryStringParameters({
        limit: '5',
        offset: '0',
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.items).toBeDefined();
    expect(parsedBody.data.items.length).toBe(0);
    expect(parsedBody.data.total).toBe(0);
  });

  it('Error - Should return a 400 error if the query parameters are missing', async () => {
    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toContain('Missing required query parameters: limit, offset');
  });
});
