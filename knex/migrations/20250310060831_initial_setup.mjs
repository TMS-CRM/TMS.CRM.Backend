/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema
    .createTable('Tenant', (table) => {
      table.increments('Id').primary();
      table.uuid('ExternalUuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('Name', 50).notNullable();
      table.timestamp('CreatedOn').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('ModifiedOn');
      table.timestamp('DeletedOn');
    })
    .createTable('User', (table) => {
      table.increments('Id').primary();
      table.uuid('ExternalUuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('CognitoUuid', 50).unique();
      table.string('FirstName', 50).notNullable();
      table.string('LastName', 50).notNullable();
      table.string('Email', 100).unique().notNullable();
      table.timestamp('CreatedOn').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('ModifiedOn');
      table.timestamp('DeletedOn');
    })
    .createTable('UserTenant', (table) => {
      table.increments('Id').primary();
      table.integer('UserId').references('Id').inTable('User').onDelete('CASCADE');
      table.integer('TenantId').references('Id').inTable('Tenant').onDelete('CASCADE');
      table.timestamp('CreatedOn').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('ModifiedOn');
      table.timestamp('DeletedOn');
    })
    .createTable('Customer', (table) => {
      table.increments('Id').primary();
      table.uuid('ExternalUuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('TenantId').references('Id').inTable('Tenant').notNullable().onDelete('CASCADE');
      table.string('FirstName', 50).notNullable();
      table.string('LastName', 50).notNullable();
      table.string('Email', 100);
      table.string('Phone', 50);
      table.string('Street', 255);
      table.string('City', 100);
      table.string('State', 50);
      table.string('ZipCode', 20);
      table.string('ImageUrl', 255);
      table.timestamp('CreatedOn').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('ModifiedOn');
      table.timestamp('DeletedOn');
    })
    .createTable('Deal', (table) => {
      table.increments('Id').primary();
      table.uuid('ExternalUuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('TenantId').references('Id').inTable('Tenant').notNullable().onDelete('CASCADE');
      table.integer('CustomerId').references('Id').inTable('Customer').notNullable().onDelete('CASCADE');
      table.string('ImageUrl', 255);
      table.string('Street', 255);
      table.string('City', 100);
      table.string('State', 50);
      table.string('ZipCode', 20);
      table.decimal('RoomArea', 8, 2);
      table.decimal('Price', 10, 2);
      table.integer('NumberOfPeople');
      table.timestamp('AppointmentDate').notNullable();
      table.string('Progress', ['inProgress', 'pending', 'closed']).notNullable();
      table.string('SpecialInstructions');
      table.string('RoomAccess', ['keysWithDoorman', 'keysInLockbox', 'keysObtained', 'keysNotRequired', 'other']).notNullable();
      table.timestamp('CreatedOn').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('ModifiedOn');
      table.timestamp('DeletedOn');
    })
    .createTable('Task', (table) => {
      table.increments('Id').primary();
      table.uuid('ExternalUuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('TenantId').references('Id').inTable('Tenant').notNullable().onDelete('CASCADE');
      table.string('Description').notNullable();
      table.timestamp('DueDate').notNullable();
      table.boolean('Completed').defaultTo(false);
      table.timestamp('CreatedOn').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('ModifiedOn');
      table.timestamp('DeletedOn');
    })
    .createTable('Activity', (table) => {
      table.increments('Id').primary();
      table.uuid('ExternalUuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('TenantId').references('Id').inTable('Tenant').notNullable().onDelete('CASCADE');
      table.integer('DealId').references('Id').inTable('Deal').notNullable().onDelete('CASCADE');
      table.string('Description');
      table.timestamp('Date').notNullable();
      table.string('ImageUrl', 255);
      table.timestamp('CreatedOn').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('ModifiedOn');
      table.timestamp('DeletedOn');
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema
    .dropTableIfExists('Task')
    .dropTableIfExists('Activity')
    .dropTableIfExists('Deal')
    .dropTableIfExists('Customer')
    .dropTableIfExists('UserTenant')
    .dropTableIfExists('User')
    .dropTableIfExists('Tenant');
}
