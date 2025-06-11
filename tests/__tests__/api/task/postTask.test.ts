import { handler } from '../../../../lambdas/api/task/postTask.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantDatabase } from '../../../../models/entities/tenant.js';
import { selectTaskByExternalUuid } from '../../../../repositories/taskRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TenantDatabaseBuilder } from '../../../builders/tenantDatabaseBuilder.js';

describe('API - Task - POST', () => {
  const tenantsGlobal: TenantDatabase[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName).insert(TenantDatabaseBuilder.make().withName('Tenant 1').build()).returning('*');
    tenantsGlobal.push(...tenant);
  });

  it('Success - Should create a task', async () => {
    const payload = {
      description: 'Test are now implemented',
      dueDate: new Date().toISOString(),
      completed: false,
    };

    const event = APIGatewayProxyEventBuilder.make()
      .withBody(payload)
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('PersistSuccess');
    expect(parsedBody.data.uuid).toBeDefined();
    expect(parsedBody.data.description).toBe(payload.description);
    expect(parsedBody.data.dueDate).toBe(payload.dueDate);
    expect(parsedBody.data.completed).toBe(payload.completed);
    expect(parsedBody.data.createdOn).toBeDefined();
    expect(parsedBody.data.modifiedOn).toBeNull();

    // Validate the database record
    const task = await selectTaskByExternalUuid(parsedBody.data.uuid);
    expect(task).toBeDefined();
    expect(task?.tenantId).toBe(tenantsGlobal[0].id);
    expect(task?.description).toBe(payload.description);
    expect(task?.dueDate).toBeDefined();
    expect(new Date(task!.dueDate).getTime()).toBeCloseTo(new Date(payload.dueDate).getTime());
    expect(task?.completed).toBe(payload.completed);
    expect(task?.createdOn).toBeDefined();
    expect(task?.modifiedOn).toBeNull();
  });

  it('Error - Should return a 400 error if the body is missing required fields', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withBody({
        dueDate: new Date().toISOString(),
        completed: false,
      })
      .withAuthorizerClaims({
        tenantUuid: tenantsGlobal[0].external_uuid,
      })
      .build();

    // Run the handler
    const res = await handler(event);

    // Validate the API response
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('BadRequestError');
    expect(parsedBody.message).toContain('Missing fields: description');
  });
});
