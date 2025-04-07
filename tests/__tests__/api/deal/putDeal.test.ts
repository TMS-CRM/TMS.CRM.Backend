import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import { randomUUID } from 'crypto';
import type { CustomerEntry } from '../../../../models/database/customerEntry.js';
import { customerTableName } from '../../../../repositories/customerRepository.js';
import { CustomerEntryBuilder } from '../../../builders/customerEntryBuilder.js';
import { DealProgress, RoomAccess, type DealEntry } from '../../../../models/database/dealEntry.js';
import { dealTableName, selectDealByExternalUuid } from '../../../../repositories/dealRepository.js';
import { DealEntryBuilder } from '../../../builders/dealEntryBuilder.js';
import type { PutDealRequestPayload } from '../../../../models/api/payloads/deal.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { handler } from '../../../../lambdas/api/deal/putDeal.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Deal - PUT', () => {
  const tenantsGlobal: TenantEntry[] = [];
  let customersGlobal: CustomerEntry[] = [];
  let dealsGlobal: DealEntry[] = [];

  beforeEach(async () => {
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
          .withTenantId(tenant[0].Id)
          .withCustomerId(customersGlobal[0].Id)
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
      customerUuid: customersGlobal[0].ExternalUuid,
      street: 'New Street Name',
      city: dealsGlobal[0].City,
      state: dealsGlobal[0].State,
      zipCode: dealsGlobal[0].ZipCode,
      roomArea: dealsGlobal[0].RoomArea,
      price: dealsGlobal[0].Price,
      numberOfPeople: dealsGlobal[0].NumberOfPeople,
      appointmentDate: dealsGlobal[0].AppointmentDate,
      progress: dealsGlobal[0].Progress,
      specialInstructions: dealsGlobal[0].SpecialInstructions,
      roomAccess: dealsGlobal[0].RoomAccess,
      imageUrl: dealsGlobal[0].ImageUrl,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: dealsGlobal[0].ExternalUuid,
      })
      .withBody(payload)
      .withQueryStringParameters({
        tenantId: tenantsGlobal[0].Id.toString(),
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

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
    expect(parsedBody.data.street).toBe('New Street Name');
    expect(parsedBody.data.city).toBe(payload.city);
    expect(parsedBody.data.state).toBe(payload.state);
    expect(parsedBody.data.zipCode).toBe(payload.zipCode);
    expect(parsedBody.data.roomArea).toBe(payload.roomArea);
    expect(parsedBody.data.price).toBe(payload.price);
    expect(parsedBody.data.numberOfPeople).toBe(payload.numberOfPeople);
    expect(new Date(parsedBody.data.appointmentDate).getTime()).toBeCloseTo(new Date(dealsGlobal[0].AppointmentDate).getTime());
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
    expect(deal!.Street).toBe(payload.street);
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const payload: Partial<PutDealRequestPayload> = {
      customerUuid: customersGlobal[0].ExternalUuid,
      street: 'New Street Name',
      city: dealsGlobal[0].City,
      state: dealsGlobal[0].State,
      zipCode: dealsGlobal[0].ZipCode,
      roomArea: dealsGlobal[0].RoomArea,
      price: dealsGlobal[0].Price,
      numberOfPeople: dealsGlobal[0].NumberOfPeople,
      appointmentDate: dealsGlobal[0].AppointmentDate,
      progress: DealProgress.InProgress,
      specialInstructions: dealsGlobal[0].SpecialInstructions,
      roomAccess: RoomAccess.KeysWithDoorman,
      imageUrl: dealsGlobal[0].ImageUrl,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
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
    expect(parsedBody.message).toBe('Missing path parameters: uuid');
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    // Payload missing the street and city
    const payload: Partial<PutDealRequestPayload> = {
      customerUuid: customersGlobal[0].ExternalUuid,
      city: dealsGlobal[0].City,
      state: dealsGlobal[0].State,
      zipCode: dealsGlobal[0].ZipCode,
      price: dealsGlobal[0].Price,
      appointmentDate: dealsGlobal[0].AppointmentDate,
      progress: DealProgress.InProgress,
      roomAccess: RoomAccess.KeysWithDoorman,
      imageUrl: dealsGlobal[0].ImageUrl,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: dealsGlobal[0].ExternalUuid,
      })
      .withBody(payload)
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
    expect(parsedBody.message).toBe('Missing fields: street, roomArea, numberOfPeople, specialInstructions');
  });

  it('Error - Should return a 400 error if the deal does not exist', async () => {
    const payload: PutDealRequestPayload = {
      customerUuid: customersGlobal[0].ExternalUuid,
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
    expect(parsedBody.message).toBe('Deal not found');
  });
});
