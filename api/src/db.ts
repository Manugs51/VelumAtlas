import { Pool, PoolClient, QueryResult } from 'pg';
import { env } from './env';

const pool = new Pool(
  env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
      }
);

type QueryFn = (text: string, params?: unknown[]) => Promise<QueryResult>;
type TransactionFn = <T>(work: (client: PoolClient) => Promise<T>) => Promise<T>;

const defaultQuery: QueryFn = async (text, params = []) => pool.query(text, params);
const defaultWithTransaction: TransactionFn = async <T>(work: (client: PoolClient) => Promise<T>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

let queryImplementation: QueryFn = defaultQuery;
let withTransactionImplementation: TransactionFn = defaultWithTransaction;

export async function query(text: string, params: unknown[] = []): Promise<QueryResult> {
  return queryImplementation(text, params);
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  return withTransactionImplementation(work);
}

export function setDbTestDoubles(testDoubles: {
  query?: QueryFn;
  withTransaction?: TransactionFn;
}): void {
  if (testDoubles.query) {
    queryImplementation = testDoubles.query;
  }

  if (testDoubles.withTransaction) {
    withTransactionImplementation = testDoubles.withTransaction;
  }
}

export function resetDbTestDoubles(): void {
  queryImplementation = defaultQuery;
  withTransactionImplementation = defaultWithTransaction;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
