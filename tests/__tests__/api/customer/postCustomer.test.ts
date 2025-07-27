import { handler } from '../../../../lambdas/api/customer/postCustomer.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import type { UserDatabase } from '../../../../models/entities/user.js';
import { selectCustomerByExternalUuid } from '../../../../repositories/customerRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';
import { UserDatabaseBuilder } from '../../../builders/userDatabaseBuilder.js';

describe('API - Customers - POST', () => {
  const testUsers: UserDatabase[] = [];
  const testTenants: TenantDatabase[] = [];

  beforeAll(async () => {
    const user = await knexClient(userTableName)
      .insert(UserDatabaseBuilder.make().withFirstName('Test').withLastName('User').withEmail('post.customer@example.com').build())
      .returning('*');
    testUsers.push(...user);

    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');
    testTenants.push(...tenant);
  });

  it('Success - Should create a customer', async () => {
    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '123-456-7890',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withUserAndTenant({
        tenantUuid: testTenants[0].external_uuid,
        userCognitoUuid: testUsers[0].cognito_uuid,
      })
      .withBody(payload)
      .build();

    // Run the handler
    const response = await handler(event);

    // Validate the API response
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();

    const parsedBody = JSON.parse(response.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data).toEqual(
      expect.objectContaining({
        uuid: expect.any(String),
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        street: payload.street,
        city: payload.city,
        state: payload.state,
        zipCode: payload.zipCode,
        createdOn: expect.any(String),
        modifiedOn: null,
      }),
    );

    // Validate the database record
    const customer = await selectCustomerByExternalUuid(parsedBody.data.uuid);
    expect(customer).toBeDefined();
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withUserAndTenant({
        tenantUuid: testTenants[0].external_uuid,
        userCognitoUuid: testUsers[0].cognito_uuid,
      })
      .withBody({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      })
      .build();

    // Run the handler
    const response = await handler(event);

    // Validate the API response
    expect(response.statusCode).toBe(400);
    expect(response.body).toBeDefined();

    const parsedBody = JSON.parse(response.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: phone, street, city, state, zipCode');
  });
});
