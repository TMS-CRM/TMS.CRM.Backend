import { randomUUID } from 'crypto';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/deal/putDeal.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { PutDealRequestPayload } from '../../../../models/api/payloads/deal.js';
import type { CustomerDatabase } from '../../../../models/entities/customer.js';
import { type DealDatabase, DealProgress, RoomAccess } from '../../../../models/entities/deal.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { dealTableName, selectDealByExternalUuid } from '../../../../repositories/dealRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { CustomerDatabaseBuilder } from '../../../builders/customerDatabaseBuilder.js';
import { DealDatabaseBuilder } from '../../../builders/dealDatabaseBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Deal - PUT', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const customersGlobal: CustomerDatabase[] = [];
  const dealsGlobal: DealDatabase[] = [];

  beforeEach(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const customer = await knexClient(customerTableName)
      .insert(
        CustomerDatabaseBuilder.make()
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
        DealDatabaseBuilder.make()
          .withTenantId(tenant[0].Id)
          .withCustomerId(customersGlobal[0].id)
          .withStreet('123 Main St')
          .withCity('Springfield')
          .withState('IL')
          .withZipCode('62701')
          .withRoomArea(1000)
          .withPrice(100000)
          .withNumberOfPeople(2)
          .withAppointmentDate(new Date().toISOString())
          .withProgress(DealProgress.InProgress)
          .withSpecialInstructions('Special instructions')
          .withRoomAccess(RoomAccess.KeysWithDoorman)
          .withDealImageUrl('https://example.com/deal.jpg')
          .build(),
      )
      .returning('*');

    dealsGlobal.push(...deal);
  });

  it('Success - Should update a deal', async () => {
    const payload: PutDealRequestPayload = {
      customerUuid: customersGlobal[0].external_uuid,
      street: 'New Street Name',
      city: dealsGlobal[0].city,
      state: dealsGlobal[0].state,
      zipCode: dealsGlobal[0].zip_code,
      roomArea: dealsGlobal[0].room_area,
      price: dealsGlobal[0].price,
      numberOfPeople: dealsGlobal[0].number_of_people,
      appointmentDate: dealsGlobal[0].appointment_date,
      progress: dealsGlobal[0].progress,
      specialInstructions: dealsGlobal[0].special_instructions,
      roomAccess: dealsGlobal[0].room_access,
      imageUrl: dealsGlobal[0].image_url,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: dealsGlobal[0].external_uuid,
      })
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.customer.uuid).toBe(customersGlobal[0].external_uuid);
    expect(parsedBody.data.customer.imageUrl).toBe(customersGlobal[0].image_url);
    expect(parsedBody.data.customer.firstName).toBe(customersGlobal[0].first_name);
    expect(parsedBody.data.customer.lastName).toBe(customersGlobal[0].last_name);
    expect(parsedBody.data.customer.email).toBe(customersGlobal[0].email);
    expect(parsedBody.data.customer.phone).toBe(customersGlobal[0].phone);
    expect(parsedBody.data.street).toBe('New Street Name');
    expect(parsedBody.data.city).toBe(payload.city);
    expect(parsedBody.data.state).toBe(payload.state);
    expect(parsedBody.data.zipCode).toBe(payload.zipCode);
    expect(parsedBody.data.roomArea).toBe(payload.roomArea);
    expect(parsedBody.data.price).toBe(payload.price);
    expect(parsedBody.data.numberOfPeople).toBe(payload.numberOfPeople);
    expect(new Date(parsedBody.data.appointmentDate).getTime()).toBeCloseTo(new Date(dealsGlobal[0].appointment_date).getTime());
    expect(parsedBody.data.progress).toBe(payload.progress);
    expect(parsedBody.data.specialInstructions).toBe(payload.specialInstructions);
    expect(parsedBody.data.roomAccess).toBe(payload.roomAccess);
    expect(parsedBody.data.imageUrl).toBe(payload.imageUrl);
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();

    // Validate the database record (filds was changed)
    const deal = await selectDealByExternalUuid(parsedBody.data.uuid);
    expect(deal).toBeDefined();
    expect(deal!.street).toBe(payload.street);
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const payload: Partial<PutDealRequestPayload> = {
      customerUuid: customersGlobal[0].external_uuid,
      street: 'New Street Name',
      city: dealsGlobal[0].city,
      state: dealsGlobal[0].state,
      zipCode: dealsGlobal[0].zip_code,
      roomArea: dealsGlobal[0].room_area,
      price: dealsGlobal[0].price,
      numberOfPeople: dealsGlobal[0].number_of_people,
      appointmentDate: dealsGlobal[0].appointment_date,
      progress: DealProgress.InProgress,
      specialInstructions: dealsGlobal[0].special_instructions,
      roomAccess: RoomAccess.KeysWithDoorman,
      imageUrl: dealsGlobal[0].image_url,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
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

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    // Payload missing the street and city
    const payload: Partial<PutDealRequestPayload> = {
      customerUuid: customersGlobal[0].external_uuid,
      city: dealsGlobal[0].city,
      state: dealsGlobal[0].state,
      zipCode: dealsGlobal[0].zip_code,
      price: dealsGlobal[0].price,
      appointmentDate: dealsGlobal[0].appointment_date,
      progress: DealProgress.InProgress,
      roomAccess: RoomAccess.KeysWithDoorman,
      imageUrl: dealsGlobal[0].image_url,
    };

    // Event missing the uuid path parameters
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: dealsGlobal[0].external_uuid,
      })
      .withBody(payload)
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
    expect(parsedBody.message).toBe('Missing fields: street, roomArea, numberOfPeople, specialInstructions');
  });

  it('Error - Should return a 400 error if the deal does not exist', async () => {
    const payload: PutDealRequestPayload = {
      customerUuid: customersGlobal[0].external_uuid,
      street: '456 Elm St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      roomArea: 1000,
      price: 100000,
      numberOfPeople: 2,
      appointmentDate: new Date().toISOString(),
      progress: DealProgress.InProgress,
      specialInstructions: 'Special instructions',
      roomAccess: RoomAccess.KeysWithDoorman,
      imageUrl: 'https://example.com/deal.jpg',
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: randomUUID() })
      .withBody(payload)
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
    expect(parsedBody.message).toBe('Deal not found');
  });
});
