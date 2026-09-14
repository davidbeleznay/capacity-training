import {sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),day:text('day').notNull(),payload:text('payload').notNull()},t=>[index('idx_records_owner_day').on(t.owner,t.day)]);
