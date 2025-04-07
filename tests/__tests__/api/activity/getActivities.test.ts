import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';
import { DealProgress, RoomAccess, type DealEntry } from '../../../../models/database/dealEntry.js';
import { DealEntryBuilder } from '../../../builders/dealEntryBuilder.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { activityTableName } from '../../../../repositories/activityRepository.js';
import { ActivityEntryBuilder } from '../../../builders/activityEntryBuilder.js';
import { handler } from '../../../../lambdas/api/activity/getActivities.js';

describe('API - Activities - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const dealsGlobal: DealEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([TenantEntryBuilder.make().withName('Tenant 1').build(), TenantEntryBuilder.make().withName('Tenant 2').build()])
      .returning('*');
    tenantsGlobal.push(...tenant);

    // Insert a deal
    const deal = await knexClient(dealTableName)
      .insert([
        DealEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withCustomerId(1)
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
          .withCustomerId(2)
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
          .withCustomerId(2)
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

    dealsGlobal.push(...deal);

    // Insert 9 activities
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

    await knexClient(activityTableName)
      .insert([
        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
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
      .withQueryStringParameters({
        limit: '5',
        offset: '0',
        tenantId: tenantsGlobal[0].Id.toString(), // TODO: Remove once the tenant is pulled from the token
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
    expect(parsedBody.data.total).toBe(10);
  });

  it('Success - Should get activities with pagination using offset', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withQueryStringParameters({
        limit: '5',
        offset: '5',
        tenantId: tenantsGlobal[0].Id.toString(), // TODO: Remove once the tenant is pulled from the token
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
    expect(parsedBody.data.total).toBe(10);
  });

  it('Success - Should return 0 activities if the tenant has no activities', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withQueryStringParameters({
        limit: '5',
        offset: '0',
        tenantId: tenantsGlobal[1].Id.toString(), // TODO: Remove once the tenant is pulled from the token
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
      .withQueryStringParameters({
        tenantId: tenantsGlobal[0].Id.toString(),
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
