import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/deal/getDeal.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { CustomerDatabase } from '../../../../models/entities/customer.js';
import { type DealDatabase, DealProgress, RoomAccess } from '../../../../models/entities/deal.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { DealDatabaseBuilder } from '../../../builders/dealDatabaseBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Deal - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerDatabase[] = [];
  const dealsGlobal: DealDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');

    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert([
        CustomerDatabaseBuilder.make()
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
        DealDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withCustomerId(customersGlobal[0].id)
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
        uuid: dealsGlobal[0].external_uuid,
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
    expect(responseData.customer.uuid).toBe(customersGlobal[0].external_uuid);
    expect(responseData.customer.imageUrl).toBe(customersGlobal[0].image_url);
    expect(responseData.customer.firstName).toBe(customersGlobal[0].first_name);
    expect(responseData.customer.lastName).toBe(customersGlobal[0].last_name);
    expect(responseData.customer.email).toBe(customersGlobal[0].email);
    expect(responseData.customer.phone).toBe(customersGlobal[0].phone);
    expect(responseData.street).toBe(dealsGlobal[0].street);
    expect(responseData.city).toBe(dealsGlobal[0].city);
    expect(responseData.state).toBe(dealsGlobal[0].state);
    expect(responseData.zipCode).toBe(dealsGlobal[0].zip_code);
    expect(responseData.imageUrl).toBe(dealsGlobal[0].image_url);
    expect(responseData.roomArea).toBe(dealsGlobal[0].room_area);
    expect(responseData.price).toBe(dealsGlobal[0].price);
    expect(responseData.numberOfPeople).toBe(dealsGlobal[0].number_of_people);
    expect(new Date(responseData.appointmentDate).getTime()).toBeCloseTo(new Date(dealsGlobal[0].appointment_date).getTime());
    expect(responseData.progress).toBe(dealsGlobal[0].progress);
    expect(responseData.roomAccess).toBe(dealsGlobal[0].room_access);
    expect(responseData.specialInstructions).toBe(dealsGlobal[0].special_instructions);
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
