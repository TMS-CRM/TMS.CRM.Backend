import { dealTableName } from './dealRepository.js';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import type { IActivityEntry } from '../models/database/activityEntry.js';
import { ExtendedActivityEntry } from '../models/database/activityEntry.js';

export const activityTableName = 'Activity';

/** Insert the activity */
export async function insertActivity(activity: Partial<IActivityEntry>): Promise<number> {
  const query = knexClient(activityTableName).insert(activity).returning('Id');
  const records = (await query) as IActivityEntry[];

  logger.info(`Successfully inserted activity. Id: ${records[0].Id}`);
  return records[0].Id;
}

/** Get the activity by Id */
export async function selectActivityById(id: number): Promise<ExtendedActivityEntry | null> {
  const query = knexClient(activityTableName)
    .select(`${activityTableName}.*`, `${dealTableName}.ExternalUuid as DealExternalUuid`)
    .innerJoin(dealTableName, `${activityTableName}.DealId`, '=', `${dealTableName}.Id`)
    .where(`${activityTableName}.Id`, id)
    .whereNull(`${activityTableName}.DeletedOn`);

  const records = (await query) as Record<string, unknown>[];

  return records.length > 0 ? new ExtendedActivityEntry(records[0]) : null;
}

/** Get the activity by ExternalUuid */
export async function selectActivityByExternalUuid(externalUuid: string): Promise<ExtendedActivityEntry | null> {
  const query = knexClient(activityTableName)
    .select(`${activityTableName}.*`, `${dealTableName}.ExternalUuid as DealExternalUuid`)
    .innerJoin(dealTableName, `${activityTableName}.DealId`, '=', `${dealTableName}.Id`)
    .where(`${activityTableName}.ExternalUuid`, externalUuid)
    .whereNull(`${activityTableName}.DeletedOn`);

  const records = (await query) as Record<string, unknown>[];

  return records.length > 0 ? new ExtendedActivityEntry(records[0]) : null;
}

export async function selectActivities(limit: number, offset: number, tenantId: number): Promise<PaginatedResponse<ExtendedActivityEntry>> {
  const baseQuery = knexClient(activityTableName)
    .innerJoin(dealTableName, `${activityTableName}.DealId`, '=', `${dealTableName}.Id`)
    .where(`${activityTableName}.TenantId`, tenantId)
    .whereNull(`${activityTableName}.DeletedOn`);

  // Get the activities
  const activities = (await baseQuery
    .clone()
    .limit(limit)
    .offset(offset)
    .select(`${activityTableName}.*`, `${dealTableName}.ExternalUuid as DealExternalUuid`)) as Record<string, unknown>[];

  // Get the total number of activities
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: activities.map((activity) => new ExtendedActivityEntry(activity)),
    total: Number(total),
  };
}

/** Update the activity */
export async function updateActivity(activityId: number, activity: Partial<IActivityEntry>): Promise<void> {
  await knexClient(activityTableName).update(activity).where('Id', activityId);

  logger.info(`Successfully updated activity. Id: ${activityId}`);
}

/** Delete the Activity */
export async function softDeleteActivityById(activityId: number): Promise<void> {
  const query = knexClient(activityTableName).update({ DeletedOn: new Date().toISOString() }).where('Id', activityId).returning('Id');
  const records = (await query) as IActivityEntry[];

  logger.info(`Successfully soft deleted Activity. Id: ${records[0].Id}`);
}
