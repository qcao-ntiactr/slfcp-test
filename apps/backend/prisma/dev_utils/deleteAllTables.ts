import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllTablesAndEnums(schema: string) {
  try {
    // Fetch all tables in the given schema
    const tables: { tablename: string }[] = await prisma.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1`,
      schema
    );

    // Fetch all ENUM types in the schema
    const enums: { typname: string }[] = await prisma.$queryRawUnsafe(
      `SELECT typname FROM pg_type WHERE typcategory = 'E' AND typnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = $1
      )`,
      schema
    );

    if (tables.length === 0 && enums.length === 0) {
      console.log(`No tables or enums found in schema: ${schema}`);
      return;
    }

    // Disable foreign key constraints temporarily
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

    // Drop all tables
    for (const { tablename } of tables) {
      await prisma.$executeRawUnsafe(
        `DROP TABLE IF EXISTS "${schema}"."${tablename}" CASCADE;`
      );
      console.log(`Dropped table: ${tablename}`);
    }

    // Drop all ENUM types
    for (const { typname } of enums) {
      await prisma.$executeRawUnsafe(
        `DROP TYPE IF EXISTS "${schema}"."${typname}" CASCADE;`
      );
      console.log(`Dropped enum: ${typname}`);
    }

    // Re-enable foreign key constraints
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    console.log(
      `All tables and enums in schema '${schema}' have been deleted.`
    );
  } catch (error) {
    console.error('Error deleting tables and enums:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute with "public" schema (change if needed)
deleteAllTablesAndEnums('public');
