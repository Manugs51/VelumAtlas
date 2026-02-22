export type MockTables = {
  owners: Array<Record<string, unknown>>;
  accounts: Array<Record<string, unknown>>;
  instruments: Array<Record<string, unknown>>;
  ledgerTransactions: Array<Record<string, unknown>>;
  postings: Array<Record<string, unknown>>;
  importProfiles: Array<Record<string, unknown>>;
  fxRates: Array<Record<string, unknown>>;
  securityPrices: Array<Record<string, unknown>>;
  corporateActions: Array<Record<string, unknown>>;
  taxLots: Array<Record<string, unknown>>;
  dailyPositionSnapshot: Array<Record<string, unknown>>;
  dailyNetWorthSnapshot: Array<Record<string, unknown>>;
};

export const mockTables: MockTables = {
  owners: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Ada Lovelace',
      created_at: '2026-01-10T10:30:00.000Z'
    }
  ],
  accounts: [
    {
      id: '00000000-0000-0000-0000-000000000011',
      owner_id: '00000000-0000-0000-0000-000000000001',
      name: 'Main Checking',
      ledger_kind: 'asset',
      type: 'bank',
      base_currency: 'USD',
      institution: 'Velum Bank',
      is_taxable: true,
      is_active: true,
      created_at: '2026-01-10T10:35:00.000Z'
    }
  ],
  instruments: [
    {
      id: '00000000-0000-0000-0000-000000000021',
      kind: 'stock',
      symbol: 'ACME',
      ticker: 'ACME',
      isin: 'US0000000001',
      name: 'ACME Corp',
      quote_currency: 'USD',
      country_code: 'US',
      tax_category: 'equity',
      price_source: 'manual',
      is_active: true,
      created_at: '2026-01-10T10:40:00.000Z'
    }
  ],
  ledgerTransactions: [
    {
      id: '00000000-0000-0000-0000-000000000031',
      occurred_at: '2026-01-10T10:45:00.000Z',
      effective_date: '2026-01-10',
      type: 'deposit',
      status: 'confirmed',
      primary_account_id: '00000000-0000-0000-0000-000000000011',
      description: 'Initial funding',
      external_id: 'ext-001',
      tags: ['seed'],
      created_at: '2026-01-10T10:45:10.000Z',
      updated_at: '2026-01-10T10:45:10.000Z'
    }
  ],
  postings: [
    {
      id: 1,
      transaction_id: '00000000-0000-0000-0000-000000000031',
      line_no: 1,
      account_id: '00000000-0000-0000-0000-000000000011',
      instrument_id: null,
      posting_kind: 'principal',
      quantity: '0',
      amount: '1000.00',
      currency_code: 'USD',
      amount_home: '1000.00',
      fx_rate: null,
      memo: 'Incoming transfer',
      created_at: '2026-01-10T10:45:11.000Z'
    },
    {
      id: 2,
      transaction_id: '00000000-0000-0000-0000-000000000031',
      line_no: 2,
      account_id: '00000000-0000-0000-0000-000000000011',
      instrument_id: null,
      posting_kind: 'principal',
      quantity: '0',
      amount: '-1000.00',
      currency_code: 'USD',
      amount_home: '-1000.00',
      fx_rate: null,
      memo: 'Counter entry',
      created_at: '2026-01-10T10:45:12.000Z'
    }
  ],
  importProfiles: [
    {
      id: '00000000-0000-0000-0000-000000000041',
      profile_name: 'Bank CSV Profile',
      source_file: 'bank.csv',
      sheet_name: 'Sheet1',
      header_row_index: 0,
      data_start_row_index: 1,
      column_mapping: {
        bookingDate: 0,
        valueDate: 1,
        description: 2,
        amount: 3,
        currency: 4,
        reference: 5,
        runningBalance: 6
      },
      currency_mode: 'column',
      fixed_currency_code: null,
      sample_rows: [['2026-01-10', '2026-01-10', 'Salary', '1000', 'USD', 'ABC', '1000']],
      created_at: '2026-01-10T10:50:00.000Z'
    }
  ],
  fxRates: [],
  securityPrices: [],
  corporateActions: [],
  taxLots: [],
  dailyPositionSnapshot: [],
  dailyNetWorthSnapshot: []
};
