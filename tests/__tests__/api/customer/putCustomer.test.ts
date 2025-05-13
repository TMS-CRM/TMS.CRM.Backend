import { randomUUID } from 'crypto';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/customer/putCustomer.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { PutCustomerRequestPayload } from '../../../../models/api/payloads/customer.js';
import type { CustomerEntry } from '../../../../models/database/customerEntry.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { customerTableName, selectCustomerByExternalUuid } from '../../../../repositories/customerRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerEntryBuilder } from '../../../builders/customerEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Customer - PUT', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert(
        CustomerEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('John')
          .withLastName('Doe')
          .withEmail('john.doe@example.com')
          .withPhone('1234567890')
          .withStreet('234/Rose')
          .withCity('Auckland')
          .withState('AKL')
          .withZipCode('1010')
          .withCustomerImageUrl('https://example.com/image.jpg')
          .build(),
      )
      .returning(['*']);

    customersGlobal.push(...customer);
  });

  it('Success - Should update a customer', async () => {
    const payload: PutCustomerRequestPayload = {
      firstName: customersGlobal[0].FirstName,
      lastName: customersGlobal[0].LastName,
      email: 'new.john.doe@example.com',
      phone: customersGlobal[0].Phone,
      street: customersGlobal[0].Street,
      city: customersGlobal[0].City,
      state: customersGlobal[0].State,
      zipCode: customersGlobal[0].ZipCode,
      imageUrl: String(customersGlobal[0].ImageUrl),
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .withPathParameters({
        uuid: customersGlobal[0].ExternalUuid,
      })
      .withBody(payload)
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.firstName).toBe(payload.firstName);
    expect(parsedBody.data.lastName).toBe(payload.lastName);
    expect(parsedBody.data.email).toBe(payload.email);
    expect(parsedBody.data.phone).toBe(payload.phone);
    expect(parsedBody.data.street).toBe(payload.street);
    expect(parsedBody.data.city).toBe(payload.city);
    expect(parsedBody.data.state).toBe(payload.state);
    expect(parsedBody.data.zipCode).toBe(payload.zipCode);
    expect(parsedBody.data.imageUrl).toBe(payload.imageUrl);

    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();

    // Validate the database record
    const customer = await selectCustomerByExternalUuid(parsedBody.data.uuid);
    expect(customer).toBeDefined();
    expect(customer!.Email).toBe(payload.email);
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const payload: PutCustomerRequestPayload = {
      firstName: customersGlobal[0].FirstName,
      lastName: customersGlobal[0].LastName,
      email: 'new.john.doe@example.com',
      phone: customersGlobal[0].Phone,
      street: customersGlobal[0].Street,
      city: customersGlobal[0].City,
      state: customersGlobal[0].State,
      zipCode: customersGlobal[0].ZipCode,
      imageUrl: String(customersGlobal[0].ImageUrl),
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing path parameters: uuid');
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    // Payload missing the email, phone, street, city, state, zipCode
    const payload: Partial<PutCustomerRequestPayload> = {
      firstName: customersGlobal[0].FirstName,
      lastName: customersGlobal[0].LastName,
      imageUrl: String(customersGlobal[0].ImageUrl),
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: customersGlobal[0].ExternalUuid })
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: email, phone, street, city, state, zipCode');
  });

  it('Error - Should return a 400 error if the customer does not exist', async () => {
    const payload: PutCustomerRequestPayload = {
      firstName: 'Marcus',
      lastName: 'Aurelius',
      email: 'marcus.aurelius@example.com',
      phone: '0987654321',
      street: '123/Colosseum',
      city: 'Rome',
      state: 'ROM',
      zipCode: '00100',
      imageUrl: 'https://example.com/marcus.jpg',
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: randomUUID() })
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Customer not found');
  });
});
