import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/customer/getCustomers.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Customers - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([
        TenantEntryBuilder.make().withName('Tenant 1').build(),
        TenantEntryBuilder.make().withName('Tenant 2').build(),
        TenantEntryBuilder.make().withName('Tenant 3').build(),
      ])
      .returning('*');
    tenantsGlobal.push(...tenant);

    // Insert 9 customers
    await knexClient(customerTableName)
      .insert([
        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('John')
          .withLastName('Doe')
          .withEmail('john.doe@example.com')
          .withPhone('642103273577')
          .withStreet('101 Elm Street')
          .withCity('Wellington')
          .withState('Wellington Region')
          .withZipCode('6011')
          .withCustomerImageUrl('http/5678')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Alice')
          .withLastName('Smith')
          .withEmail('alice.smith@example.com')
          .withPhone('642103273578')
          .withStreet('202 Oak Avenue')
          .withCity('Christchurch')
          .withState('Canterbury')
          .withZipCode('8013')
          .withCustomerImageUrl('http/9101')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Bob')
          .withLastName('Johnson')
          .withEmail('bob.johnson@example.com')
          .withPhone('642103273579')
          .withStreet('303 Pine Lane')
          .withCity('Hamilton')
          .withState('Waikato')
          .withZipCode('3204')
          .withCustomerImageUrl('http/1121')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Emma')
          .withLastName('Brown')
          .withEmail('emma.brown@example.com')
          .withPhone('642103273580')
          .withStreet('404 Maple Drive')
          .withCity('Dunedin')
          .withState('Otago')
          .withZipCode('9016')
          .withCustomerImageUrl('http/3141')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Liam')
          .withLastName('Wilson')
          .withEmail('liam.wilson@example.com')
          .withPhone('642103273581')
          .withStreet('505 Birch Road')
          .withCity('Tauranga')
          .withState('Bay of Plenty')
          .withZipCode('3110')
          .withCustomerImageUrl('http/5161')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Sophia')
          .withLastName('Taylor')
          .withEmail('sophia.taylor@example.com')
          .withPhone('642103273582')
          .withStreet('606 Cedar Street')
          .withCity('Napier')
          .withState("Hawke's Bay")
          .withZipCode('4110')
          .withCustomerImageUrl('http/7181')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Noah')
          .withLastName('Anderson')
          .withEmail('noah.anderson@example.com')
          .withPhone('642103273583')
          .withStreet('707 Spruce Avenue')
          .withCity('Palmerston North')
          .withState('Manawatu-Wanganui')
          .withZipCode('4410')
          .withCustomerImageUrl('http/9202')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Olivia')
          .withLastName('Martinez')
          .withEmail('olivia.martinez@example.com')
          .withPhone('642103273584')
          .withStreet('808 Willow Court')
          .withCity('Rotorua')
          .withState('Bay of Plenty')
          .withZipCode('3010')
          .withCustomerImageUrl('http/1223')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withFirstName('Ethan')
          .withLastName('Clark')
          .withEmail('ethan.clark@example.com')
          .withPhone('642103273585')
          .withStreet('909 Aspen Way')
          .withCity('Invercargill')
          .withState('Southland')
          .withZipCode('9810')
          .withCustomerImageUrl('http/3245')
          .build(),
      ])
      .returning('id');

    await knexClient(customerTableName)
      .insert([
        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[1].Id)
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
      .returning('id');
  });

  it('Success - Should get customers with pagination', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
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

  it('Success - Should get customers with pagination using offset', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
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
    expect(parsedBody.data.items.length).toBe(4); // Exclude the first 5 customers
    expect(parsedBody.data.total).toBe(9); // Total number of customers should still be 9
  });

  it('Success - Should return 0 customers if the tenant has no customers', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[2].ExternalUuid,
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
    expect(parsedBody.message).toContain('Missing required query parameters: limit, offset');
  });
});
