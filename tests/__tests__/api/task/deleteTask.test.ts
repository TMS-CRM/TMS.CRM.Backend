import { randomUUID } from 'crypto';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/task/deleteTask.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TaskEntry } from '../../../../models/database/taskEntry.js';
import type { TenantEntry } from '../../../../models/database/tenantEntry.js';
import { selectTaskByExternalUuid, taskTableName } from '../../../../repositories/taskRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TaskEntryBuilder } from '../../../builders/taskEntryBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Task - DELETE', () => {
  const tenantsGlobal: TenantEntry[] = [];
  const tasksGlobal: TaskEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantEntryBuilder.make().withName('Tenant 1').build()).returning('*');

    tenantsGlobal.push(...tenant);

    const task = await knexClient(taskTableName)
      .insert(
        TaskEntryBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Test are now implemented')
          .withDueDate(new Date().toISOString())
          .withCompleted(true)
          .build(),
      )
      .returning('*');

    tasksGlobal.push(...task);
  });

  it('Success - Should soft delete a task', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({
        uuid: tasksGlobal[0].ExternalUuid,
      })
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(204);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('DeleteSuccess');

    // Validate the database record
    const task = await selectTaskByExternalUuid(tasksGlobal[0].ExternalUuid);
    expect(task).toBeNull();
  });

  it('Error - Should return a 400 error if the path parameter is missing', async () => {
    const event = APIGatewayProxyEventBuilder.make()
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

  it('Error - Should return a 400 error if the task does not exist', async () => {
    // Event missing the uuid path parameter
    const event = APIGatewayProxyEventBuilder.make()
      .withPathParameters({ uuid: randomUUID() })
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
    expect(parsedBody.message).toBe('Task not found');
  });
});
