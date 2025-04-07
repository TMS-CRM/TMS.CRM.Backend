import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import { randomUUID } from 'crypto';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import type { TaskEntry } from '../../../../models/database/taskEntry.js';
import { selectTaskByExternalUuid, taskTableName } from '../../../../repositories/taskRepository.js';
import { TaskEntryBuilder } from '../../../builders/taskEntryBuilder.js';
import type { PutTaskRequestPayload } from '../../../../models/api/payloads/task.js';
import { handler } from '../../../../lambdas/api/task/putTask.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';
describe('API - Task - PUT', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const tasksGlobal: TaskEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const task = await knexClient(taskTableName)
      .insert([
        TaskEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Test are now implemented')
          .withDueDate(new Date().toISOString())
          .withCompleted(false)
          .build(),
      ])
      .returning('*');

    tasksGlobal.push(...task);
  });

  it('Success - Should update a task', async () => {
    const payload: PutTaskRequestPayload = {
      description: 'Test are now updated',
      dueDate: tasksGlobal[0].DueDate,
      completed: true,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: tasksGlobal[0].ExternalUuid,
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
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.description).toBe(payload.description);
    expect(new Date(parsedBody.data.dueDate).getTime()).toBeCloseTo(new Date(tasksGlobal[0].DueDate).getTime());
    expect(parsedBody.data.completed).toBe(payload.completed);

    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();

    // Validate the database record
    const task = await selectTaskByExternalUuid(parsedBody.data.uuid);
    expect(task).toBeDefined();
    expect(task!.Description).toBe(payload.description);
    expect(task!.Completed).toBe(payload.completed);
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const payload: PutTaskRequestPayload = {
      description: 'Test are now updated',
      dueDate: tasksGlobal[0].DueDate,
      completed: true,
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
    // Payload missing the description
    const payload: Partial<PutTaskRequestPayload> = {
      dueDate: tasksGlobal[0].DueDate,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: tasksGlobal[0].ExternalUuid })
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
    expect(parsedBody.message).toBe('Missing fields: description, completed');
  });

  it('Error - Should return a 400 error if the task does not exist', async () => {
    const payload: PutTaskRequestPayload = {
      description: 'Test are now updated',
      dueDate: new Date().toISOString(),
      completed: false,
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
    expect(parsedBody.message).toBe('Task not found');
  });
});
