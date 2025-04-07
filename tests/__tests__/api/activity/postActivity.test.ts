import { handler } from '../../../../lambdas/api/activity/postActivity.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerEntry } from '../../../../models/database/customerEntry.js';
import type { DealEntry } from '../../../../models/database/dealEntry.js';
import { DealProgress, RoomAccess } from '../../../../models/database/dealEntry.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { selectActivityByExternalUuid } from '../../../../repositories/activityRepository.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerEntryBuilder } from '../../../builders/customerEntryBuilder.js';
import { DealEntryBuilder } from '../../../builders/dealEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Activity - POST', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const dealsGlobal: DealEntry[] = [];
  const customersGlobal: CustomerEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert(
        CustomerEntryBuilder.make()
          .withTenantId(tenant[0].Id)
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
  });

  it('Success - Should create a activity', async () => {
    const payload = {
      description: 'This is a test activity',
      imageUrl: 'https://www.google.com',
      date: new Date().toISOString(),
      dealUuid: dealsGlobal[0].ExternalUuid,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withQueryStringParameters({
        tenantId: tenantsGlobal[0].Id.toString(),
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
    expect(activity?.TenantId).toBe(tenantsGlobal[0].Id);
    expect(activity?.DealId).toBe(dealsGlobal[0].Id);
    expect(activity?.Description).toBe(payload.description);
    expect(activity?.ImageUrl).toBe(payload.imageUrl);
    expect(new Date(activity!.Date).getTime()).toBeCloseTo(new Date(payload.date).getTime());
    expect(activity?.CreatedOn).toBeDefined();
    expect(activity?.ModifiedOn).toBeNull();
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        description: 'This is a test activity',
        imageUrl: 'https://www.google.com',
        dealUuid: dealsGlobal[0].ExternalUuid,
      })
      .withQueryStringParameters({
        tenantId: tenantsGlobal[0].Id.toString(),
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
