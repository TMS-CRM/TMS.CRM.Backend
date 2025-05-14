import { customerTableName } from './customerRepository.js';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import type { DealEntry, IDealEntry } from '../models/entities/dealEntry.js';
import { ExtendedDealEntry } from '../models/entities/dealEntry.js';

export const dealTableName = 'Deal';

/** Insert the Deal */
export async function insertDeal(deal: Partial<DealEntry>): Promise<number> {
  const query = knexClient(dealTableName).insert(deal).returning('Id');
  const records = (await query) as IDealEntry[];

  logger.info(`Successfully inserted Deal. Id: ${records[0].Id}`);
  return records[0].Id;
}

/** Get the Deal by Id */
export async function selectDealById(id: number): Promise<ExtendedDealEntry | null> {
  const query = knexClient(dealTableName)
    .select(
      `${dealTableName}.*`,
      `${customerTableName}.ExternalUuid as CustomerExternalUuid`,
      `${customerTableName}.ImageUrl as CustomerImageUrl`,
      `${customerTableName}.FirstName as CustomerFirstName`,
      `${customerTableName}.LastName as CustomerLastName`,
      `${customerTableName}.Email as CustomerEmail`,
      `${customerTableName}.Phone as CustomerPhone`,
    )
    .innerJoin(customerTableName, `${dealTableName}.CustomerId`, '=', `${customerTableName}.Id`)
    .where(`${dealTableName}.Id`, id)
    .whereNull(`${dealTableName}.DeletedOn`)
    .whereNull(`${customerTableName}.DeletedOn`);

  const records = (await query) as Record<string, unknown>[];
  return records.length > 0 ? new ExtendedDealEntry(records[0]) : null;
}

/** Get the Deal by ExternalUuid */
export async function selectDealByExternalUuid(externalUuid: string): Promise<ExtendedDealEntry | null> {
  const query = knexClient(dealTableName)
    .select(
      `${dealTableName}.*`,
      `${customerTableName}.ExternalUuid as CustomerExternalUuid`,
      `${customerTableName}.ImageUrl as CustomerImageUrl`,
      `${customerTableName}.FirstName as CustomerFirstName`,
      `${customerTableName}.LastName as CustomerLastName`,
      `${customerTableName}.Email as CustomerEmail`,
      `${customerTableName}.Phone as CustomerPhone`,
    )
    .innerJoin(customerTableName, `${dealTableName}.CustomerId`, '=', `${customerTableName}.Id`)
    .where(`${dealTableName}.ExternalUuid`, externalUuid)
    .whereNull(`${dealTableName}.DeletedOn`);

  const records = (await query) as Record<string, unknown>[];
  return records.length > 0 ? new ExtendedDealEntry(records[0]) : null;
}

export async function selectDeals(limit: number, offset: number, tenantId: number): Promise<PaginatedResponse<ExtendedDealEntry>> {
  // Base query without deleted deals
  const baseQuery = knexClient(dealTableName)
    .whereNull(`${dealTableName}.DeletedOn`)
    .innerJoin(customerTableName, `${dealTableName}.CustomerId`, '=', `${customerTableName}.Id`)
    .where(`${dealTableName}.TenantId`, tenantId)
    .whereNull(`${customerTableName}.DeletedOn`);

  // Get the deals
  const deals = (await baseQuery
    .clone()
    .limit(limit)
    .offset(offset)
    .select(
      `${dealTableName}.*`,
      `${customerTableName}.ExternalUuid as CustomerExternalUuid`,
      `${customerTableName}.ImageUrl as CustomerImageUrl`,
      `${customerTableName}.FirstName as CustomerFirstName`,
      `${customerTableName}.LastName as CustomerLastName`,
      `${customerTableName}.Email as CustomerEmail`,
      `${customerTableName}.Phone as CustomerPhone`,
    )) as Record<string, unknown>[];

  // Get the total number of deals
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: deals.map((deal) => new ExtendedDealEntry(deal)),
    total: Number(total),
  };
}

/** Update the Deal */
export async function updateDeal(dealId: number, deal: Partial<IDealEntry>): Promise<void> {
  await knexClient(dealTableName).update(deal).where('Id', dealId);

  logger.info(`Successfully updated User. Id: ${dealId}`);
}

/** Delete the Deal */
export async function softDeleteDealById(dealId: number): Promise<void> {
  const query = knexClient(dealTableName).update({ DeletedOn: new Date().toISOString() }).where('Id', dealId).returning('Id');
  const records = (await query) as IDealEntry[];

  logger.info(`Successfully soft deleted Deal. Id: ${records[0].Id}`);
}
