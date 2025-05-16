import { customerTableName } from './customerRepository.js';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import { Deal, type DealDatabase, type ExtendedDealDatabase } from '../models/entities/deal.js';

export const dealTableName = 'deal';

/** Insert the deal */
export async function insertDeal(deal: Partial<DealDatabase>): Promise<number> {
  const query = knexClient(dealTableName).insert(deal).returning('id');
  const records = (await query) as DealDatabase[];

  logger.info(`Successfully inserted Deal. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the deal by Id */
export async function selectDealById(id: number): Promise<Deal | null> {
  const query = knexClient(dealTableName)
    .select(
      `${dealTableName}.*`,
      `${customerTableName}.external_uuid as customer_external_uuid`,
      `${customerTableName}.image_url as customer_image_url`,
      `${customerTableName}.first_name as customer_first_name`,
      `${customerTableName}.last_name as customer_last_name`,
      `${customerTableName}.email as customer_email`,
      `${customerTableName}.phone as customer_phone`,
    )
    .innerJoin(customerTableName, `${dealTableName}.customer_id`, '=', `${customerTableName}.id`)
    .where(`${dealTableName}.id`, id)
    .whereNull(`${dealTableName}.deleted_on`);
  // .whereNull(`${customerTableName}.DeletedOn`);

  const records = (await query) as ExtendedDealDatabase[];
  return records.length > 0 ? new Deal(records[0]) : null;
}

/** Get the Deal by ExternalUuid */
export async function selectDealByExternalUuid(externalUuid: string): Promise<Deal | null> {
  const query = knexClient(dealTableName)
    .select(
      `${dealTableName}.*`,
      `${customerTableName}.external_uuid as customer_external_uuid`,
      `${customerTableName}.image_url as customer_image_url`,
      `${customerTableName}.first_name as customer_first_name`,
      `${customerTableName}.last_name as customer_last_name`,
      `${customerTableName}.email as customer_email`,
      `${customerTableName}.phone as customer_phone`,
    )
    .innerJoin(customerTableName, `${dealTableName}.customer_id`, '=', `${customerTableName}.id`)
    .where(`${dealTableName}.external_uuid`, externalUuid)
    .whereNull(`${dealTableName}.deleted_on`);

  const records = (await query) as ExtendedDealDatabase[];
  return records.length > 0 ? new Deal(records[0]) : null;
}

export async function selectDeals(limit: number, offset: number, tenantId: number): Promise<PaginatedResponse<Deal>> {
  // Base query without deleted deals
  const baseQuery = knexClient(dealTableName)
    .whereNull(`${dealTableName}.deleted_on`)
    .innerJoin(customerTableName, `${dealTableName}.customer_id`, '=', `${customerTableName}.id`)
    .where(`${dealTableName}.tenant_id`, tenantId)
    .whereNull(`${dealTableName}.deleted_on`);

  // Get the deals
  const deals = (await baseQuery
    .clone()
    .limit(limit)
    .offset(offset)
    .select(
      `${dealTableName}.*`,
      `${customerTableName}.external_uuid as customer_external_uuid`,
      `${customerTableName}.image_url as customer_image_url`,
      `${customerTableName}.first_name as customer_first_name`,
      `${customerTableName}.last_name as customer_last_name`,
      `${customerTableName}.email as customer_email`,
      `${customerTableName}.phone as customer_phone`,
    )) as ExtendedDealDatabase[];

  // Get the total number of deals
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: deals.map((deal) => new Deal(deal)),
    total: Number(total),
  };
}

/** Update the Deal */
export async function updateDeal(dealId: number, deal: Partial<DealDatabase>): Promise<void> {
  await knexClient(dealTableName).update(deal).where('id', dealId);

  logger.info(`Successfully updated User. Id: ${dealId}`);
}

/** Delete the Deal */
export async function softDeleteDealById(dealId: number): Promise<void> {
  const query = knexClient(dealTableName).update({ deleted_on: new Date().toISOString() }).where('id', dealId).returning('id');
  const records = (await query) as DealDatabase[];

  logger.info(`Successfully soft deleted Deal. Id: ${records[0].id}`);
}
