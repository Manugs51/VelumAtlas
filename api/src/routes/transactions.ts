import { PoolClient } from 'pg';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db';

const decimalValueSchema = z
  .union([z.string().regex(/^-?\d+(\.\d+)?$/), z.number().finite()])
  .transform((value) => value.toString());

const postingInputSchema = z.object({
  accountId: z.string().uuid(),
  instrumentId: z.string().uuid().optional(),
  postingKind: z.enum(['principal', 'fee', 'tax', 'withholding', 'fx', 'adjustment']).optional(),
  quantity: decimalValueSchema.optional(),
  amount: decimalValueSchema,
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  amountHome: decimalValueSchema,
  fxRate: decimalValueSchema.optional(),
  memo: z.string().max(500).optional()
});

const createTransactionSchema = z.object({
  occurredAt: z.string().datetime(),
  effectiveDate: z.string().date(),
  type: z.enum([
    'trade_buy',
    'trade_sell',
    'dividend',
    'interest',
    'transfer',
    'deposit',
    'withdrawal',
    'fee',
    'tax',
    'expense',
    'income',
    'corporate_action',
    'adjustment'
  ]),
  status: z.enum(['draft', 'confirmed', 'voided']).optional(),
  primaryAccountId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  externalId: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).optional(),
  postings: z.array(postingInputSchema).min(2)
});

const listTransactionsSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'voided']).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});

function assertBalanced(postings: Array<{ amountHome: string }>): void {
  const sum = postings.reduce((acc, posting) => acc + Number(posting.amountHome), 0);
  if (Math.abs(sum) > 0.00000001) {
    throw new Error('Transaction is not balanced in home currency (sum(amountHome) must equal 0).');
  }
}

async function insertPostings(client: PoolClient, transactionId: string, postings: z.infer<typeof postingInputSchema>[]): Promise<void> {
  for (let i = 0; i < postings.length; i += 1) {
    const posting = postings[i];
    await client.query(
      `
      INSERT INTO finance.postings (
        transaction_id, line_no, account_id, instrument_id, posting_kind,
        quantity, amount, currency_code, amount_home, fx_rate, memo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        transactionId,
        i + 1,
        posting.accountId,
        posting.instrumentId ?? null,
        posting.postingKind ?? 'principal',
        posting.quantity ?? '0',
        posting.amount,
        posting.currencyCode,
        posting.amountHome,
        posting.fxRate ?? null,
        posting.memo ?? null
      ]
    );
  }
}

export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/transactions', async (request) => {
    const params = listTransactionsSchema.parse(request.query);

    const result = await query(
      `
      SELECT id, occurred_at, effective_date, type, status, primary_account_id, description, external_id, tags, created_at, updated_at
      FROM finance.ledger_transactions
      WHERE ($1::finance.transaction_status IS NULL OR status = $1)
        AND ($2::date IS NULL OR effective_date >= $2)
        AND ($3::date IS NULL OR effective_date <= $3)
      ORDER BY effective_date DESC, created_at DESC
      LIMIT $4 OFFSET $5
      `,
      [params.status ?? null, params.from ?? null, params.to ?? null, params.limit, params.offset]
    );

    return { data: result.rows };
  });

  app.get('/transactions/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const txResult = await query(
      `
      SELECT id, occurred_at, effective_date, type, status, primary_account_id, description, external_id, tags, created_at, updated_at
      FROM finance.ledger_transactions
      WHERE id = $1
      `,
      [params.id]
    );

    if (!txResult.rows[0]) {
      return reply.code(404).send({ error: 'Transaction not found' });
    }

    const postingResult = await query(
      `
      SELECT id, line_no, account_id, instrument_id, posting_kind, quantity, amount, currency_code, amount_home, fx_rate, memo, created_at
      FROM finance.postings
      WHERE transaction_id = $1
      ORDER BY line_no ASC
      `,
      [params.id]
    );

    return {
      data: {
        ...txResult.rows[0],
        postings: postingResult.rows
      }
    };
  });

  app.post('/transactions', async (request, reply) => {
    const payload = createTransactionSchema.parse(request.body);

    if (payload.status === 'confirmed') {
      assertBalanced(payload.postings.map((posting) => ({ amountHome: posting.amountHome })));
    }

    const inserted = await withTransaction(async (client) => {
      const txResult = await client.query(
        `
        INSERT INTO finance.ledger_transactions (
          occurred_at, effective_date, type, status, primary_account_id, description, external_id, tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, occurred_at, effective_date, type, status, primary_account_id, description, external_id, tags, created_at, updated_at
        `,
        [
          payload.occurredAt,
          payload.effectiveDate,
          payload.type,
          payload.status ?? 'draft',
          payload.primaryAccountId ?? null,
          payload.description ?? null,
          payload.externalId ?? null,
          payload.tags ?? []
        ]
      );

      const tx = txResult.rows[0];
      await insertPostings(client, tx.id, payload.postings);
      return tx;
    });

    return reply.code(201).send({ data: inserted });
  });
}
