import { randomUUID } from 'crypto';
import { handler } from '../../../../lambdas/api/task/getTask.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TaskEntry } from '../../../../models/entities/taskEntry.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { taskTableName } from '../../../../repositories/taskRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TaskEntryBuilder } from '../../../builders/taskEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Task - GET', () => {
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
          .withCompleted(true)
          .build(),
      ])
      .returning('*');

    tasksGlobal.push(...task);
  });

  it('Success - Should get a task', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: tasksGlobal[0].ExternalUuid,
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
    expect(parsedBody.data.description).toBe(tasksGlobal[0].Description);
    expect(new Date(parsedBody.data.dueDate).getTime()).toBeCloseTo(new Date(tasksGlobal[0].DueDate).getTime());
    expect(parsedBody.data.completed).toBe(tasksGlobal[0].Completed);
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeDefined();
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

  it('Error - Should return a 400 error if the task does not exist', async () => {
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
    expect(parsedBody.message).toBe('Task not found');
  });
});
