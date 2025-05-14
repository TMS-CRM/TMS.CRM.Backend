import { randomUUID } from 'crypto';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/activity/deleteActivity.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { ActivityDatabase } from '../../../../models/entities/activity.js';
import type { CustomerEntry } from '../../../../models/entities/customerEntry.js';
import type { DealEntry } from '../../../../models/entities/dealEntry.js';
import { DealProgress, RoomAccess } from '../../../../models/entities/dealEntry.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { activityTableName, selectActivityByExternalUuid } from '../../../../repositories/activityRepository.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { ActivityDatabaseBuilder } from '../../../builders/activityDatabaseBuilder.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerEntryBuilder } from '../../../builders/customerEntryBuilder.js';
import { DealEntryBuilder } from '../../../builders/dealEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Activity - DELETE', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerEntry[] = [];
  const dealsGlobal: DealEntry[] = [];
  const activitiesGlobal: ActivityDatabase[] = [];

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
          .withPrice(100)
          .withStreet('202/3 Rose Garden Lane')
          .withCity('Auckland')
          .withState('Auckland Region')
          .withZipCode('0632')
          .withDealImageUrl('http/1234')
          .withRoomArea(100)
          .withNumberOfPeople(2)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .withSpecialInstructions('Special instructions')
          .build(),
      )
      .returning('*');

    dealsGlobal.push(...deal);

    const activity = await knexClient(activityTableName)
      .insert(
        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDealId(dealsGlobal[0].Id)
          .withDescription('Sample activity description')
          .withDate(new Date().toISOString())
          .withImageUrl('http://example.com/profile.jpg')
          .build(),
      )
      .returning('*');

    activitiesGlobal.push(...activity);
  });

  it('Success - Should delete a activity', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: activitiesGlobal[0].external_uuid,
      })
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(204);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('DeleteSuccess');

    // Validate the database record
    const activity = await selectActivityByExternalUuid(activitiesGlobal[0].external_uuid);
    expect(activity).toBeNull();
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
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
    expect(parsedBody.message).toBe('Missing path parameters: uuid');
  });

  it('Error - Should return a 400 error if the activity does not exist', async () => {
    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: randomUUID() })
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
    expect(parsedBody.message).toBe('Activity not found');
  });
});
