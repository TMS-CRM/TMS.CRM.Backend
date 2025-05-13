import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/deal/getDeal.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerEntry } from '../../../../models/database/customerEntry.js';
import type { DealEntry } from '../../../../models/database/dealEntry.js';
import { DealProgress, RoomAccess } from '../../../../models/database/dealEntry.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerEntryBuilder } from '../../../builders/customerEntryBuilder.js';
import { DealEntryBuilder } from '../../../builders/dealEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Deal - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerEntry[] = [];
  const dealsGlobal: DealEntry[] = [];

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
      .insert([
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
          .withSpecialInstructions('Special Instructions')
          .build(),
      ])
      .returning('*');
    dealsGlobal.push(...deal);
  });

  it('Success - Should get a deal', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: dealsGlobal[0].ExternalUuid,
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

    const responseData = parsedBody.data;
    expect(responseData.customer.uuid).toBe(customersGlobal[0].ExternalUuid);
    expect(responseData.customer.imageUrl).toBe(customersGlobal[0].ImageUrl);
    expect(responseData.customer.firstName).toBe(customersGlobal[0].FirstName);
    expect(responseData.customer.lastName).toBe(customersGlobal[0].LastName);
    expect(responseData.customer.email).toBe(customersGlobal[0].Email);
    expect(responseData.customer.phone).toBe(customersGlobal[0].Phone);
    expect(responseData.street).toBe(dealsGlobal[0].Street);
    expect(responseData.city).toBe(dealsGlobal[0].City);
    expect(responseData.state).toBe(dealsGlobal[0].State);
    expect(responseData.zipCode).toBe(dealsGlobal[0].ZipCode);
    expect(responseData.imageUrl).toBe(dealsGlobal[0].ImageUrl);
    expect(responseData.roomArea).toBe(dealsGlobal[0].RoomArea);
    expect(responseData.price).toBe(dealsGlobal[0].Price);
    expect(responseData.numberOfPeople).toBe(dealsGlobal[0].NumberOfPeople);
    expect(new Date(responseData.appointmentDate).getTime()).toBeCloseTo(new Date(dealsGlobal[0].AppointmentDate).getTime());
    expect(responseData.progress).toBe(dealsGlobal[0].Progress);
    expect(responseData.roomAccess).toBe(dealsGlobal[0].RoomAccess);
    expect(responseData.specialInstructions).toBe(dealsGlobal[0].SpecialInstructions);
    expect(responseData.uuid).toBeDefined();
    expect(responseData.createdOn).toBeDefined();
    expect(responseData.modifiedOn).toBeDefined();
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

  it('Error - Should return a 400 error if the deal does not exist', async () => {
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
    expect(parsedBody.message).toBe('Deal not found');
  });
});
