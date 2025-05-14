import { handler } from '../../../../lambdas/api/deal/postDeal.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerEntry } from '../../../../models/entities/customerEntry.js';
import { DealProgress, RoomAccess } from '../../../../models/entities/dealEntry.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { selectDealByExternalUuid } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerEntryBuilder } from '../../../builders/customerEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Deal - POST', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerEntry[] = [];

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
  });

  it('Success - Should create a deal', async () => {
    const payload = {
      customerUuid: customersGlobal[0].ExternalUuid,
      price: 100,
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      roomArea: 50,
      numberOfPeople: 2,
      appointmentDate: new Date().toISOString(),
      progress: DealProgress.InProgress,
      specialInstructions: 'Handle with care',
      roomAccess: RoomAccess.KeysInLockbox,
      imageUrl: 'https://example.com/image.jpg',
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
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
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.customer.uuid).toBe(customersGlobal[0].ExternalUuid);
    expect(parsedBody.data.customer.imageUrl).toBe(customersGlobal[0].ImageUrl);
    expect(parsedBody.data.customer.firstName).toBe(customersGlobal[0].FirstName);
    expect(parsedBody.data.customer.lastName).toBe(customersGlobal[0].LastName);
    expect(parsedBody.data.customer.email).toBe(customersGlobal[0].Email);
    expect(parsedBody.data.customer.phone).toBe(customersGlobal[0].Phone);
    expect(parsedBody.data.street).toBe('123 Main St');
    expect(parsedBody.data.city).toBe('Anytown');
    expect(parsedBody.data.state).toBe('CA');
    expect(parsedBody.data.zipCode).toBe('12345');
    expect(parsedBody.data.roomArea).toBeCloseTo(50);
    expect(parsedBody.data.price).toBeCloseTo(100);
    expect(parsedBody.data.numberOfPeople).toBe(2);
    expect(new Date(parsedBody.data.appointmentDate).getTime()).toBeCloseTo(new Date(payload.appointmentDate).getTime());
    expect(parsedBody.data.progress).toBe(DealProgress.InProgress);
    expect(parsedBody.data.specialInstructions).toBe('Handle with care');
    expect(parsedBody.data.roomAccess).toBe(RoomAccess.KeysInLockbox);
    expect(parsedBody.data.imageUrl).toBe('https://example.com/image.jpg');
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeNull();

    // Validate the database record
    const deal = await selectDealByExternalUuid(parsedBody.data.uuid);
    expect(deal).toBeDefined();
    expect(deal?.TenantId).toBe(tenantsGlobal[0].Id);
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        price: '1000000',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        customerUuid: '12345678-1234-1234-1234-123456789012',
      })
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
    expect(parsedBody.message).toBe('Missing fields: zipCode, roomArea, numberOfPeople, appointmentDate, progress, roomAccess');
  });
});
