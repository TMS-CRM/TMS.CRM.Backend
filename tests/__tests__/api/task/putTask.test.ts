import { randomUUID } from 'crypto';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/task/putTask.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { PutTaskRequestPayload } from '../../../../models/api/payloads/task.js';
import type { TaskDatabase } from '../../../../models/entities/task.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import { selectTaskByExternalUuid, taskTableName } from '../../../../repositories/taskRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TaskDatabaseBuilder } from '../../../builders/taskDatabaseBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';

describe('API - Task - PUT', () => {
  const tenantsGlobal: TenantDatabase[] = [];
  const tasksGlobal: TaskDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);

    const task = await knexClient(taskTableName)
      .insert([
        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].id)
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
      dueDate: tasksGlobal[0].due_date,
      completed: true,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: tasksGlobal[0].external_uuid,
      })
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].external_uuid,
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
    expect(new Date(parsedBody.data.dueDate).getTime()).toBeCloseTo(new Date(tasksGlobal[0].due_date).getTime());
    expect(parsedBody.data.completed).toBe(payload.completed);

    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();

    // Validate the database record
    const task = await selectTaskByExternalUuid(parsedBody.data.uuid);
    expect(task).toBeDefined();
    expect(task!.description).toBe(payload.description);
    expect(task!.completed).toBe(payload.completed);
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const payload: PutTaskRequestPayload = {
      description: 'Test are now updated',
      dueDate: tasksGlobal[0].due_date,
      completed: true,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].external_uuid,
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
      dueDate: tasksGlobal[0].due_date,
    };

    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: tasksGlobal[0].external_uuid })
      .withBody(payload)
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].external_uuid,
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
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].external_uuid,
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
