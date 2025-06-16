/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema
    .createTable('tenant', (table) => {
      table.increments('id').primary();
      table.uuid('external_uuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 50).notNullable();
      table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('modified_on');
      table.timestamp('deleted_on');
    })
    .createTable('user', (table) => {
      table.increments('id').primary();
      table.uuid('external_uuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('cognito_uuid', 50).unique();
      table.string('first_name', 50).notNullable();
      table.string('last_name', 50).notNullable();
      table.string('email', 100).unique().notNullable();
      table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('modified_on');
      table.timestamp('deleted_on');
    })
    .createTable('user_tenant', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('user').onDelete('CASCADE');
      table.integer('tenant_id').references('id').inTable('tenant').onDelete('CASCADE');
      table.timestamp('authentication_requested_on');
      table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('modified_on');
      table.timestamp('deleted_on');
    })
    .createTable('customer', (table) => {
      table.increments('id').primary();
      table.uuid('external_uuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('tenant_id').references('id').inTable('tenant').notNullable().onDelete('CASCADE');
      table.string('first_name', 50).notNullable();
      table.string('last_name', 50).notNullable();
      table.string('email', 100);
      table.string('phone', 50);
      table.string('street', 255);
      table.string('city', 100);
      table.string('state', 50);
      table.string('zip_code', 20);
      table.string('image_url', 255);
      table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('modified_on');
      table.timestamp('deleted_on');
    })
    .createTable('deal', (table) => {
      table.increments('id').primary();
      table.uuid('external_uuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('tenant_id').references('id').inTable('tenant').notNullable().onDelete('CASCADE');
      table.integer('customer_id').references('id').inTable('customer').notNullable().onDelete('CASCADE');
      table.string('image_url', 255);
      table.string('street', 255);
      table.string('city', 100);
      table.string('state', 50);
      table.string('zip_code', 20);
      table.decimal('room_area', 8, 2);
      table.decimal('price', 10, 2);
      table.integer('number_of_people');
      table.timestamp('appointment_date').notNullable();
      table.string('progress', ['inProgress', 'pending', 'closed']).notNullable();
      table.string('special_instructions');
      table.string('room_access', ['keysWithDoorman', 'keysInLockbox', 'keysObtained', 'keysNotRequired', 'other']).notNullable();
      table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('modified_on');
      table.timestamp('deleted_on');
    })
    .createTable('task', (table) => {
      table.increments('id').primary();
      table.uuid('external_uuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('tenant_id').references('id').inTable('tenant').notNullable().onDelete('CASCADE');
      table.string('description').notNullable();
      table.timestamp('due_date').notNullable();
      table.boolean('completed').defaultTo(false);
      table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('modified_on');
      table.timestamp('deleted_on');
    })
    .createTable('activity', (table) => {
      table.increments('id').primary();
      table.uuid('external_uuid').unique().notNullable().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('tenant_id').references('id').inTable('tenant').notNullable().onDelete('CASCADE');
      table.integer('deal_id').references('id').inTable('deal').notNullable().onDelete('CASCADE');
      table.string('description');
      table.timestamp('date').notNullable();
      table.string('image_url', 255);
      table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('modified_on');
      table.timestamp('deleted_on');
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema
    .dropTableIfExists('task')
    .dropTableIfExists('activity')
    .dropTableIfExists('deal')
    .dropTableIfExists('customer')
    .dropTableIfExists('user_tenant')
    .dropTableIfExists('user')
    .dropTableIfExists('tenant');
}
