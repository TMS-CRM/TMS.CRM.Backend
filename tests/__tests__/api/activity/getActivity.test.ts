import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/activity/getActivity.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { ActivityEntry } from '../../../../models/database/activityEntry.js';
import type { CustomerEntry } from '../../../../models/database/customerEntry.js';
import { type DealEntry, DealProgress, RoomAccess } from '../../../../models/database/dealEntry.js';
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

describe('API - Activity - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerEntry[] = [];
  const dealsGlobal: DealEntry[] = [];
  const activitiesGlobal: ActivityEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert([
        CustomerEntryBuilder.make()
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
      ])
      .returning('*');

    customersGlobal.push(...customer);

    const deal = await knexClient(dealTableName)
      .insert(
        DealEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withCustomerId(customersGlobal[0].Id)
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
      )
      .returning('*');
    dealsGlobal.push(...deal);

    const activity = await knexClient(activityTableName)
      .insert([
        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Initial consultation with the client')
          .withDate(new Date().toISOString())
          .withImageUrl('https://example.com/activity.jpg')
          .build(),

        ActivityEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Follow-up meeting scheduled')
          .withDate(new Date().toISOString())
          .withImageUrl('https://example.com/follow-up.jpg')
          .build(),
      ])
      .returning('*');

    activitiesGlobal.push(...activity);
  });

  it('Success - Should get a activity', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: activitiesGlobal[0].ExternalUuid,
      })
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.uuid).toBe(activitiesGlobal[0].ExternalUuid);
    expect(parsedBody.data.description).toBe(activitiesGlobal[0].Description);
    expect(new Date(parsedBody.data.date).getTime()).toBeCloseTo(new Date(activitiesGlobal[0].Date).getTime());
    expect(parsedBody.data.imageUrl).toBe(activitiesGlobal[0].ImageUrl);
    expect(parsedBody.data.uuid).toBeDefined();
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

  it('Error - Should return a 400 error if the activity does not exist', async () => {
    // Event with a random uuid on the path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: randomUUID() })
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
    expect(parsedBody.message).toBe('Activity not found');
  });
});
