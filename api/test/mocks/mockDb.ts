import { PoolClient, QueryResult } from 'pg';
import { MockTables, mockTables } from './mockTables';

function result(rows: Array<Record<string, unknown>>): QueryResult {
  return {
    rows,
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: []
  };
}

export function createMockQuery(tables: MockTables = mockTables) {
  return async (text: string, params: unknown[] = []): Promise<QueryResult> => {
    if (text.includes('FROM finance.owners')) {
      return result(tables.owners);
    }

    if (text.includes('FROM finance.accounts')) {
      const ownerId = params[0] as string | null | undefined;
      const rows = ownerId ? tables.accounts.filter((account) => account.owner_id === ownerId) : tables.accounts;
      return result(rows);
    }

    if (text.includes('FROM finance.instruments')) {
      return result(tables.instruments);
    }

    if (text.includes('FROM finance.ledger_transactions') && text.includes('WHERE id = $1')) {
      const txId = params[0] as string;
      return result(tables.ledgerTransactions.filter((tx) => tx.id === txId));
    }

    if (text.includes('FROM finance.ledger_transactions')) {
      return result(tables.ledgerTransactions);
    }

    if (text.includes('FROM finance.postings')) {
      const txId = params[0] as string;
      return result(tables.postings.filter((posting) => posting.transaction_id === txId));
    }

    if (text.includes('FROM finance.import_profiles')) {
      return result(tables.importProfiles);
    }

    throw new Error(`Unhandled query in test mock: ${text}`);
  };
}

export function createMockWithTransaction(mockQuery = createMockQuery()) {
  return async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = {
      query: mockQuery
    } as unknown as PoolClient;

    return work(client);
  };
}
