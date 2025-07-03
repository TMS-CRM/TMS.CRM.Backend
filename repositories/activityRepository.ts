import { dealTableName } from './dealRepository.js';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import { Activity, type ActivityDatabase, type ExtendedActivityDatabase } from '../models/entities/activity.js';

export const activityTableName = 'activity';

/** Insert the activity */
export async function insertActivity(activity: Partial<ActivityDatabase>): Promise<number> {
  const query = knexClient(activityTableName).insert(activity).returning('id');
  const records = (await query) as ActivityDatabase[];

  logger.info(`Successfully inserted activity. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the activity by Id */
export async function selectActivityById(id: number): Promise<Activity | null> {
  const query = knexClient(activityTableName)
    .select(`${activityTableName}.*`, `${dealTableName}.external_uuid as deal_external_uuid`)
    .innerJoin(dealTableName, `${activityTableName}.deal_id`, '=', `${dealTableName}.id`)
    .where(`${activityTableName}.id`, id)
    .whereNull(`${activityTableName}.deleted_on`);

  const records = (await query) as ExtendedActivityDatabase[];

  return records.length > 0 ? new Activity(records[0]) : null;
}

/** Get the activity by ExternalUuid */
export async function selectActivityByExternalUuid(externalUuid: string): Promise<Activity | null> {
  const query = knexClient(activityTableName)
    .select(`${activityTableName}.*`, `${dealTableName}.external_uuid as deal_external_uuid`)
    .innerJoin(dealTableName, `${activityTableName}.deal_id`, '=', `${dealTableName}.id`)
    .where(`${activityTableName}.external_uuid`, externalUuid)
    .whereNull(`${activityTableName}.deleted_on`);

  const records = (await query) as ExtendedActivityDatabase[];

  return records.length > 0 ? new Activity(records[0]) : null;
}

export async function selectActivities(
  tenantId: number,
  limit: number,
  offset: number,
  dealUuid: string | null,
): Promise<PaginatedResponse<Activity>> {
  const baseQuery = knexClient(activityTableName)
    .innerJoin(dealTableName, `${activityTableName}.deal_id`, '=', `${dealTableName}.id`)
    .where(`${activityTableName}.tenant_id`, tenantId)
    .whereNull(`${activityTableName}.deleted_on`);

  if (dealUuid) {
    baseQuery.where(`${dealTableName}.external_uuid`, dealUuid);
  }

  // Get the activities
  const activities = (await baseQuery
    .clone()
    .limit(limit)
    .offset(offset)
    .select(`${activityTableName}.*`, `${dealTableName}.external_uuid as deal_external_uuid`)) as ExtendedActivityDatabase[];

  // Get the total number of activities
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: activities.map((activity) => new Activity(activity)),
    total: Number(total),
  };
}

/** Update the activity */
export async function updateActivity(activityId: number, activity: Partial<ActivityDatabase>): Promise<void> {
  await knexClient(activityTableName).update(activity).where('id', activityId);

  logger.info(`Successfully updated activity. Id: ${activityId}`);
}

/** Delete the Activity */
export async function softDeleteActivityById(activityId: number): Promise<void> {
  const query = knexClient(activityTableName).update({ deleted_on: new Date().toISOString() }).where('id', activityId).returning('id');
  const records = (await query) as ActivityDatabase[];

  logger.info(`Successfully soft deleted Activity. Id: ${records[0].id}`);
}
