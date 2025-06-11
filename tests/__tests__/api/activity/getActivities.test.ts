import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/activity/getActivities.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerDatabase } from '../../../../models/entities/customer.js';
import { type DealDatabase, DealProgress, RoomAccess } from '../../../../models/entities/deal.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import { activityTableName } from '../../../../repositories/activityRepository.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { ActivityDatabaseBuilder } from '../../../builders/activityDatabaseBuilder.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { DealDatabaseBuilder } from '../../../builders/dealDatabaseBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';

describe('API - Activities - GET', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const dealsGlobal: DealDatabase[] = [];
  const customersGlobal: CustomerDatabase[] = [];

  beforeAll(async () => {
    const tenants = await knexClient(tenantTableName)
      .insert([
        TenantDatabaseBuilder.make().withName('Tenant 1').build(),
        TenantDatabaseBuilder.make().withName('Tenant 2').build(),
        TenantDatabaseBuilder.make().withName('Tenant 3').build(),
      ])
      .returning('*');
    tenantsGlobal.push(...tenants);

    // Insert customers
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
      ])
      .returning('*');
    customersGlobal.push(...customer);

    // Insert deals
    const deals = await knexClient(dealTableName)
      .insert([
        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
          .withStreet('123 Main St')
          .withCity('New York')
          .withState('NY')
          .withZipCode('10001')
          .withRoomArea(100)
          .withPrice(1200)
          .withNumberOfPeople(2)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withSpecialInstructions('Handle with care')
          .withRoomAccess(RoomAccess.KeysInLockbox)
          .withDealImageUrl('https://example.com/image.jpg')
          .build(),

        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[1].id)
          .withStreet('123 Main St')
          .withCity('New York')
          .withState('NY')
          .withZipCode('10001')
          .withRoomArea(500)
          .withPrice(1200)
          .withNumberOfPeople(2)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withSpecialInstructions('Handle with care')
          .withRoomAccess(RoomAccess.KeysInLockbox)
          .withDealImageUrl('https://example.com/image.jpg')
          .build(),

        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[1].id)
          .withStreet('123 Main St')
          .withCity('New York')
          .withState('NY')
          .withZipCode('10001')
          .withRoomArea(500)
          .withPrice(1200)
          .withNumberOfPeople(2)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withSpecialInstructions('Handle with care')
          .withRoomAccess(RoomAccess.KeysInLockbox)
          .withDealImageUrl('https://example.com/image.jpg')
          .build(),
      ])
      .returning('*');

    dealsGlobal.push(...deals);

    // Insert 9 activities for the first tenant
    await knexClient(activityTableName)
      .insert([
        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Scheduled initial consultation')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image1.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Sent follow-up email')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image2.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Completed site visit')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image3.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Reviewed contract with client')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image4.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Negotiation phase started')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image5.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Finalized agreement terms')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image6.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Client confirmed contract')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image7.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Deposit payment received')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image8.jpg')
          .build(),

        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('Project completed successfully')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image9.jpg')
          .build(),
      ])
      .returning('*');

    // Insert 1 activity for the second tenant
    await knexClient(activityTableName)
      .insert([
        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[1].id)
          .withDealId(dealsGlobal[1].id)
          .withDescription('Develop completed successfully')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image9.jpg')
          .build(),
      ])
      .returning('*');
  });

  it('Success - Should get activities with pagination', async () => {
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

  it('Success - Should get activities with pagination using offset', async () => {
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
    expect(parsedBody.data.items.length).toBe(4);
    expect(parsedBody.data.total).toBe(9);
  });

  it('Success - Should return 0 activities if the tenant has no activities', async () => {
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
