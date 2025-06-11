import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/deal/getDeals.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerDatabase } from '../../../../models/entities/customer.js';
import { DealProgress, RoomAccess } from '../../../../models/entities/deal.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { DealDatabaseBuilder } from '../../../builders/dealDatabaseBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';

describe('API - Deals - GET', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const customersGlobal: CustomerDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([TenantDatabaseBuilder.make().withName('Tenant 1').build(), TenantDatabaseBuilder.make().withName('Tenant 2').build()])
      .returning('*');
    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert([
        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
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
          .withTenantId(tenantsGlobal[0].id)
          .withFirstName('Jane')
          .withLastName('Smith')
          .withEmail('jane.smith@example.com')
          .withPhone('642103273578')
          .withStreet('202 Oak Avenue')
          .withCity('Auckland')
          .withState('Auckland Region')
          .withZipCode('1010')
          .withCustomerImageUrl('http/6789')
          .build(),

        CustomerDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withFirstName('Sofi')
          .withLastName('Smith')
          .withEmail('sofi.smith@example.com')
          .withPhone('642103273578')
          .withStreet('202 Oak Avenue')
          .withCity('Auckland')
          .withState('Auckland Region')
          .withZipCode('1010')
          .withCustomerImageUrl('http/6789')
          .build(),
      ])
      .returning('*');
    customersGlobal.push(...customer);

    await knexClient(dealTableName)
      .insert([
        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
          .withPrice(150)
          .withStreet('202 Pine Street')
          .withCity('Auckland')
          .withState('Auckland Region')
          .withZipCode('1010')
          .withDealImageUrl('http/1234')
          .withRoomArea(120)
          .withNumberOfPeople(3)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.Closed)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .build(),

        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
          .withPrice(200)
          .withStreet('303 Oak Street')
          .withCity('Christchurch')
          .withState('Canterbury Region')
          .withZipCode('8011')
          .withDealImageUrl('http/2345')
          .withRoomArea(140)
          .withNumberOfPeople(4)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .build(),

        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
          .withPrice(250)
          .withStreet('404 Maple Street')
          .withCity('Hamilton')
          .withState('Waikato Region')
          .withZipCode('3204')
          .withDealImageUrl('http/3456')
          .withRoomArea(160)
          .withNumberOfPeople(5)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.Pending)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .build(),

        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
          .withPrice(300)
          .withStreet('505 Birch Street')
          .withCity('Dunedin')
          .withState('Otago Region')
          .withZipCode('9016')
          .withDealImageUrl('http/4567')
          .withRoomArea(180)
          .withNumberOfPeople(6)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .build(),

        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
          .withPrice(350)
          .withStreet('606 Cedar Street')
          .withCity('Tauranga')
          .withState('Bay of Plenty Region')
          .withZipCode('3110')
          .withDealImageUrl('http/5678')
          .withRoomArea(200)
          .withNumberOfPeople(7)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .build(),

        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
          .withPrice(400)
          .withStreet('707 Walnut Street')
          .withCity('Napier')
          .withState("Hawke's Bay Region")
          .withZipCode('4110')
          .withDealImageUrl('http/6789')
          .withRoomArea(220)
          .withNumberOfPeople(8)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.Pending)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .build(),
      ])
      .returning('*');

    // Insert a second deal
    await knexClient(dealTableName)
      .insert([
        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[1].id)
          .withPrice(500)
          .withStreet('808 Spruce Street')
          .withCity('Queenstown')
          .withState('Otago Region')
          .withZipCode('9300')
          .withDealImageUrl('http/7890')
          .withRoomArea(250)
          .withNumberOfPeople(10)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.Closed)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .build(),
      ])
      .returning('*');
  });

  it('Success - Should get deals with pagination', async () => {
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
    expect(parsedBody.data.total).toBe(7);
  });

  it('Success - Should get deals with pagination using offset', async () => {
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
    expect(parsedBody.data.items.length).toBe(2); // Exclude the first 5 deals
    expect(parsedBody.data.total).toBe(7); // Total number of deals should still be 6
  });

  it('Success - Should return 0 deals if the tenant has no deals', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[1].external_uuid,
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
