import { handler } from '../../../../lambdas/api/activity/postActivity.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerDatabase } from '../../../../models/entities/customer.js';
import { type DealDatabase, DealProgress, RoomAccess } from '../../../../models/entities/deal.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import { selectActivityByExternalUuid } from '../../../../repositories/activityRepository.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { DealDatabaseBuilder } from '../../../builders/dealDatabaseBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';

describe('API - Activity - POST', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const dealsGlobal: DealDatabase[] = [];
  const customersGlobal: CustomerDatabase[] = [];

  beforeAll(async () => {
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
  });

  it('Success - Should create a activity', async () => {
    const payload = {
      description: 'This is a test activity',
      imageUrl: 'https://www.google.com',
      date: new Date().toISOString(),
      dealUuid: dealsGlobal[0].external_uuid,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.dealUuid).toBe(payload.dealUuid);
    expect(parsedBody.data.description).toBe(payload.description);
    expect(parsedBody.data.imageUrl).toBe(payload.imageUrl);
    expect(parsedBody.data.date).toBe(payload.date);
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeNull();

    // Validate the database record
    const activity = await selectActivityByExternalUuid(parsedBody.data.uuid);
    expect(activity).toBeDefined();
    expect(activity?.tenantId).toBe(tenantsGlobal[0].id);
    expect(activity?.deal.id).toBe(dealsGlobal[0].id);
    expect(activity?.description).toBe(payload.description);
    expect(activity?.imageUrl).toBe(payload.imageUrl);
    expect(new Date(activity!.date).getTime()).toBeCloseTo(new Date(payload.date).getTime());
    expect(activity?.createdOn).toBeDefined();
    expect(activity?.modifiedOn).toBeNull();
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        description: 'This is a test activity',
        imageUrl: 'https://www.google.com',
        dealUuid: dealsGlobal[0].external_uuid,
      })
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: date');
  });
});
