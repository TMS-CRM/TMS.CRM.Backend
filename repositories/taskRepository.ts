import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import { type GetTaskListFilter, TaskSortBy } from '../models/api/payloads/task.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import { SortOrder } from '../models/api/validations.js';
import { Task, type TaskDatabase } from '../models/entities/task.js';

export const taskTableName = 'task';

/** Insert the task */
export async function insertTask(task: Partial<TaskDatabase>): Promise<number> {
  const query = knexClient(taskTableName).insert(task).returning('id');
  const records = (await query) as TaskDatabase[];

  logger.info(`Successfully inserted task. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the task by Id */
export async function selectTaskById(id: number): Promise<Task | null> {
  const query = knexClient(taskTableName).select('*').where('id', id).whereNull(`${taskTableName}.deleted_on`);
  const records = (await query) as TaskDatabase[];

  return records.length > 0 ? new Task(records[0]) : null;
}

/** Get the Task by external_uuid */
export async function selectTaskByExternalUuid(externalUuid: string): Promise<Task | null> {
  const query = knexClient(taskTableName).select('*').where(`${taskTableName}.external_uuid`, externalUuid).whereNull(`${taskTableName}.deleted_on`);
  const records = (await query) as TaskDatabase[];

  return records.length > 0 ? new Task(records[0]) : null;
}

export async function selectTasks(tenantId: number | null, filters: GetTaskListFilter): Promise<PaginatedResponse<Task>> {
  const sortByColumn = filters.sortBy ?? TaskSortBy.createdOn;
  const sortOrder = filters.order ?? SortOrder.desc;

  // Base query without deleted task
  const baseQuery = knexClient(taskTableName).where(`${taskTableName}.tenant_id`, tenantId).whereNull(`${taskTableName}.deleted_on`);

  if (filters.completed !== undefined) {
    baseQuery.where(`${taskTableName}.completed`, filters.completed);
  }

  // Get the tasks
  const tasks = (await baseQuery
    .clone()
    .orderBy(`${taskTableName}.${sortByColumn}`, sortOrder)
    .limit(filters.limit)
    .offset(filters.offset)
    .select('*')) as TaskDatabase[];

  // Get the total number of tasks
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: tasks.map((task) => new Task(task)),
    total: Number(total),
  };
}

/** Update the task */
export async function updateTask(taskId: number, task: Partial<TaskDatabase>): Promise<void> {
  await knexClient(taskTableName).update(task).where('id', taskId);

  logger.info(`Successfully updated Task. Id: ${taskId}`);
}

/** Delete the Task */
export async function softDeleteTaskById(taskId: number): Promise<void> {
  const query = knexClient(taskTableName).update({ deleted_on: new Date().toISOString() }).where('id', taskId).returning('id');
  const records = (await query) as TaskDatabase[];

  logger.info(`Successfully soft deleted Task. Id: ${records[0].id}`);
}
