import { randomUUID } from 'crypto';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/activity/putActivity.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { PutActivityRequestPayload } from '../../../../models/api/payloads/activity.js';
import type { ActivityDatabase } from '../../../../models/entities/activity.js';
import type { CustomerDatabase } from '../../../../models/entities/customer.js';
import { type DealDatabase, DealProgress, RoomAccess } from '../../../../models/entities/deal.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import type { UserDatabase } from '../../../../models/entities/user.js';
import { activityTableName, selectActivityByExternalUuid } from '../../../../repositories/activityRepository.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { userTableName } from '../../../../repositories/userRepository.js';
import { ActivityDatabaseBuilder } from '../../../builders/activityDatabaseBuilder.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { DealDatabaseBuilder } from '../../../builders/dealDatabaseBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';
import { UserDatabaseBuilder } from '../../../builders/userDatabaseBuilder.js';

describe('API - Activity - PUT', () => {
  const usersGlobal: UserDatabase[] = [];
  const tenantsGlobal: TenantDatabase[] = [];
  const customersGlobal: CustomerDatabase[] = [];
  const dealsGlobal: DealDatabase[] = [];
  const activitiesGlobal: ActivityDatabase[] = [];

  beforeAll(async () => {
    const user = await knexClient(userTableName)
      .insert(UserDatabaseBuilder.make().withFirstName('Test').withLastName('User').withEmail('put.activity@example.com').build())
      .returning('*');
    usersGlobal.push(...user);

    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert(
        CustomerDatabaseBuilder.make()
          .withTenantId(tenant[0].id)
          .withFirstName('John')
          .withLastName('Doe')
          .withEmail('john.doe@example.com')
          .withPhone('123-456-7890')
          .withStreet('123 Main St')
          .withCity('Springfield')
          .withState('IL')
          .withZipCode('62701')
          .withCustomerImageUrl('https://example.com/customer.jpg')
          .build(),
      )
      .returning('*');
    customersGlobal.push(...customer);

    const deal = await knexClient(dealTableName)
      .insert(
        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withCustomerId(customersGlobal[0].id)
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
      .insert(
        ActivityDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
          .withDealId(dealsGlobal[0].id)
          .withDescription('This is a test activity')
          .withImageUrl('https://www.google.com')
          .withDate(new Date().toISOString())
          .build(),
      )
      .returning('*');

    activitiesGlobal.push(...activity);
  });

  it('Success - Should update a activity', async () => {
    const payload: PutActivityRequestPayload = {
      description: 'This is a test activity',
      imageUrl: activitiesGlobal[0].image_url,
      date: activitiesGlobal[0].date,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: activitiesGlobal[0].external_uuid,
      })
      .withBody(payload)
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.dealUuid).toBe(dealsGlobal[0].external_uuid);
    expect(parsedBody.data.description).toBe(payload.description);
    expect(parsedBody.data.imageUrl).toBe(payload.imageUrl);
    expect(new Date(parsedBody.data.date).getTime()).toBeCloseTo(new Date(activitiesGlobal[0].date).getTime());
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();

    // Validate the database record
    const activity = await selectActivityByExternalUuid(parsedBody.data.uuid);
    expect(activity).toBeDefined();
    expect(activity!.description).toBe(payload.description);
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const payload: PutActivityRequestPayload = {
      description: 'This is a test activity',
      imageUrl: activitiesGlobal[0].image_url,
      date: activitiesGlobal[0].date,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
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
    // Payload missing the description
    const payload: Partial<PutActivityRequestPayload> = {
      imageUrl: activitiesGlobal[0].image_url,
      date: activitiesGlobal[0].date,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: dealsGlobal[0].external_uuid,
      })
      .withBody(payload)
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: description');
  });

  it('Error - Should return a 400 error if the activity does not exist', async () => {
    const payload: PutActivityRequestPayload = {
      description: 'This is a test activity',
      imageUrl: 'https://www.google.com',
      date: new Date().toISOString(),
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: randomUUID() })
      .withBody(payload)
      .withUserAndTenant({
        tenantUuid: tenantsGlobal[0].external_uuid,
        userCognitoUuid: usersGlobal[0].cognito_uuid,
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
