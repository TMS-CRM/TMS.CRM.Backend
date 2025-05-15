import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../../../../lambdas/api/task/getTasks.js';
import { knexClient } from '../../../../lib/utils/knexClient.js';
import type { TenantEntry } from '../../../../models/entities/tenantEntry.js';
import { taskTableName } from '../../../../repositories/taskRepository.js';
import { tenantTableName } from '../../../../repositories/tenantRepository.js';
import { APIGatewayProxyEventBuilder } from '../../../builders/apiGatewayProxyEventBuilder.js';
import { TaskDatabaseBuilder } from '../../../builders/taskDatabaseBuilder.js';
import { TenantEntryBuilder } from '../../../builders/tenantEntryBuilder.js';

describe('API - Tasks - GET', () => {
  const tenantsGlobal: TenantEntry[] = [];

  beforeAll(async () => {
    const tenant = await knexClient(tenantTableName)
      .insert([
        TenantEntryBuilder.make().withName('Tenant 1').build(),
        TenantEntryBuilder.make().withName('Tenant 2').build(),
        TenantEntryBuilder.make().withName('Tenant 3').build(),
      ])
      .returning('*');
    tenantsGlobal.push(...tenant);

    // Insert 9 tasks
    await knexClient(taskTableName)
      .insert([
        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Test are now implemented')
          .withDueDate(new Date().toISOString())
          .withCompleted(true)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(false)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(true)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(false)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(true)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(false)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(true)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(false)
          .build(),

        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[0].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(true)
          .build(),
      ])
      .returning('Id');

    await knexClient(taskTableName)
      .insert([
        TaskDatabaseBuilder.make()
          .withTenantId(tenantsGlobal[1].Id)
          .withDescription('Is it here test?')
          .withDueDate(new Date().toISOString())
          .withCompleted(true)
          .build(),
      ])
      .returning('Id');
  });

  it('Success - Should get tasks with pagination', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .withQueryStringParameters({
        limit: '5',
        offset: '0',
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.items).toBeDefined();
    expect(parsedBody.data.items.length).toBe(5);
    expect(parsedBody.data.total).toBe(9);
  });

  it('Success - Should get tasks with pagination using offset', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[0].ExternalUuid,
      })
      .withQueryStringParameters({
        limit: '5',
        offset: '5',
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.items).toBeDefined();
    expect(parsedBody.data.items.length).toBe(4); // Exclude the first 5 customers
    expect(parsedBody.data.total).toBe(9); // Total number of customers should still be 9
  });

  it('Success - Should return 0 tasks if the tenant has no tasks', async () => {
    const event = APIGatewayProxyEventBuilder.make()
      .withAuthorizerClaims({
        'custom:tenantUuid': tenantsGlobal[2].ExternalUuid,
      })
      .withQueryStringParameters({
        limit: '5',
        offset: '0',
      })
      .build();

    // Run the handler
    const res = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    // Validate the API response
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();

    const parsedBody = JSON.parse(res.body!);
    expect(parsedBody.type).toBe('FetchSuccess');
    expect(parsedBody.data.items).toBeDefined();
    expect(parsedBody.data.items.length).toBe(0);
    expect(parsedBody.data.total).toBe(0);
  });

  it('Error - Should return a 400 error if the query parameters are missing', async () => {
    // Event missing the uuid path parameter
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
    expect(parsedBody.message).toContain('Missing required query parameters: limit, offset');
  });
});
