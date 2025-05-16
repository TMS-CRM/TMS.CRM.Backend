import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/customer/getCustomer.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerDatabase } from '../../../../models/entities/customer.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Customer - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');

    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert([
        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('John')
          .withLastName('Doe')
          .withEmail('john.doe@example.com')
          .withPhone('642103273576')
          .withStreet('202/3 Rose Garden Lane')
          .withCity('Auckland')
          .withState('Auckland Region')
          .withZipCode('0632')
          .withCustomerImageUrl('http/1234')
          .build(),
        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Jane')
          .withLastName('Pan')
          .withEmail('jane.pan@example.com')
          .withPhone('642103273576')
          .withStreet('103/4 Rose Garden Lane')
          .withCity('Auckland')
          .withState('Auckland Region')
          .withZipCode('0632')
          .withCustomerImageUrl('http/1234')
          .build(),
      ])
      .returning('*');

    customersGlobal.push(...customer);
  });

  it('Success - Should get a customer', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .withPathParameters({
        uuid: customersGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.uuid).toBe(customersGlobal[0].external_uuid);
    expect(parsedBody.data.firstName).toBe(customersGlobal[0].first_name);
    expect(parsedBody.data.lastName).toBe(customersGlobal[0].last_name);
    expect(parsedBody.data.email).toBe(customersGlobal[0].email);
    expect(parsedBody.data.phone).toBe(customersGlobal[0].phone);
    expect(parsedBody.data.street).toBe(customersGlobal[0].street);
    expect(parsedBody.data.city).toBe(customersGlobal[0].city);
    expect(parsedBody.data.state).toBe(customersGlobal[0].state);
    expect(parsedBody.data.zipCode).toBe(customersGlobal[0].zip_code);
    expect(parsedBody.data.imageUrl).toBe(customersGlobal[0].image_url);
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
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
    expect(parsedBody.message).toBe('Missing path parameters: uuid');
  });

  it('Error - Should return a 400 error if the customer does not exist', async () => {
    // Event with a random uuid on the path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .withPathParameters({ uuid: randomUUID() })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Customer not found');
  });
});
