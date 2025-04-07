import { randomUUID } from 'crypto';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/user/putUser.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { PutUserRequestPayload } from '../../../../models/api/payloads/user.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import type { UserEntry } from '../../../../models/database/userEntry.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { selectUserByExternalUuid, userTableName } from '../../../../repositories/userRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';
import { UserEntryBuilder } from '../../../builders/userEntryBuilder.js';

describe('API - User - PUT', () => {
  const usersGlobal: UserEntry[] = [];
  const tenantsGlobal: TenantEntry[] = [];

  beforeAll(async () => {
    const user = await knexClient(userTableName)
      .insert(UserEntryBuilder.make().withFirstName('John').withLastName('Doe').withEmail('john.doe@example.com').build())
      .returning(['Id', 'ExternalUuid', 'FirstName', 'LastName']);

    usersGlobal.push(...user);

    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);
  });

  it('Success - Should update a user', async () => {
    const payload: PutUserRequestPayload = {
      firstName: usersGlobal[0].FirstName,
      lastName: usersGlobal[0].LastName,
      email: 'new.john.doe@example.com',
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: usersGlobal[0].ExternalUuid,
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
    expect(parsedBody.data.firstName).toBe(payload.firstName);
    expect(parsedBody.data.lastName).toBe(payload.lastName);
    expect(parsedBody.data.email).toBe(payload.email);
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();

    // Validate the database record
    const user = await selectUserByExternalUuid(parsedBody.data.uuid);
    expect(user).toBeDefined();
    expect(user!.Email).toBe(payload.email);
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const payload: PutUserRequestPayload = {
      firstName: usersGlobal[0].FirstName,
      lastName: usersGlobal[0].LastName,
      email: 'new.john.doe@example.com',
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
    // Payload missing the email
    const payload: Partial<PutUserRequestPayload> = {
      firstName: usersGlobal[0].FirstName,
      lastName: usersGlobal[0].LastName,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withPathParameters({
        uuid: usersGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toBe('Missing fields: email');
  });

  it('Error - Should return a 400 error if the user does not exist', async () => {
    const payload: PutUserRequestPayload = {
      firstName: 'Marcus',
      lastName: 'Aurelius',
      email: 'marcus.aurelius@example.com',
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
    expect(parsedBody.message).toBe('User not found');
  });
});
