import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/activity/getActivities.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { ICustomerEntry } from '../../../../models/database/customerEntry.js';
import { DealProgress, type IDealEntry, RoomAccess } from '../../../../models/database/dealEntry.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { activityTableName } from '../../../../repositories/activityRepository.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { ActivityEntryBuilder } from '../../../builders/activityEntryBuilder.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerEntryBuilder } from '../../../builders/customerEntryBuilder.js';
import { DealEntryBuilder } from '../../../builders/dealEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Activities - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const dealsGlobal: IDealEntry[] = [];
  const customersGlobal: ICustomerEntry[] = [];

  beforeAll(async () => {
    const tenants = await knexClient(tenantTableName)
      .insert([
        TenantEntryBuilder.make().withName('Tenant 1').build(),
        TenantEntryBuilder.make().withName('Tenant 2').build(),
        TenantEntryBuilder.make().withName('Tenant 3').build(),
      ])
      .returning('*');
    tenantsGlobal.push(...tenants);

    // Insert customers
    const customer = await knexClient(customerTableName)
      .insert([
        CustomerEntryBuilder.make()
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

        CustomerEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
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
        DealEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withCustomerId(customersGlobal[0].Id)
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

        DealEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withCustomerId(customersGlobal[1].Id)
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

        DealEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withCustomerId(customersGlobal[1].Id)
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
        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Scheduled initial consultation')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image1.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Sent follow-up email')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image2.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Completed site visit')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image3.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Reviewed contract with client')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image4.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Negotiation phase started')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image5.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Finalized agreement terms')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image6.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Client confirmed contract')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image7.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Deposit payment received')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image8.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Project completed successfully')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/image9.jpg')
          .build(),
      ])
      .returning('*');

    // Insert 1 activity for the second tenant
    await knexClient(activityTableName)
      .insert([
        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[1].Id)
          .withDealId(dealsGlobal[1].Id)
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

  it('Success - Should get activities with pagination using offset', async () => {
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
    expect(parsedBody.data.items.length).toBe(4);
    expect(parsedBody.data.total).toBe(9);
  });

  it('Success - Should return 0 activities if the tenant has no activities', async () => {
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
