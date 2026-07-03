export const TEST_DATABASE_NAME = 'minnekart_test';

export function testDatabaseUrl(databaseUrl: string): string {
  return withDatabaseName(databaseUrl, TEST_DATABASE_NAME);
}

export function maintenanceDatabaseUrl(databaseUrl: string): string {
  return withDatabaseName(databaseUrl, 'postgres');
}

function withDatabaseName(databaseUrl: string, name: string): string {
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}
