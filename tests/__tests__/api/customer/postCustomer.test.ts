import { handler } from '../../../../lambdas/api/customer/postCustomer.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { selectCustomerByExternalUuid } from '../../../../repositories/customerRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Customer - POST', () => {
  const tenantsGlobal: TenantEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);
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
      imageUrl: 'https://example.com/profile.jpg',
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withQueryStringParameters({
        // TODO: Remove this once the tenantId is pulled from the token
        tenantId: tenantsGlobal[0].Id.toString(),
      })
      .withBody(payload)
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.firstName).toBe(payload.firstName);
    expect(parsedBody.data.lastName).toBe(payload.lastName);
    expect(parsedBody.data.email).toBe(payload.email);
    expect(parsedBody.data.phone).toBe(payload.phone);
    expect(parsedBody.data.street).toBe(payload.street);
    expect(parsedBody.data.city).toBe(payload.city);
    expect(parsedBody.data.state).toBe(payload.state);
    expect(parsedBody.data.zipCode).toBe(payload.zipCode);
    expect(parsedBody.data.imageUrl).toBe(payload.imageUrl);
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeNull();

    // Validate the database record
    const customer = await selectCustomerByExternalUuid(parsedBody.data.uuid);
    expect(customer).toBeDefined();
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: phone, street, city, state, zipCode');
  });
});
