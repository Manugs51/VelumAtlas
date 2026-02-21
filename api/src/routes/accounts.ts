import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';

const listQuerySchema = z.object({
  ownerId: z.string().uuid().optional()
});

const createAccountSchema = z.object({
  ownerId: z.string().uuid(),
  name: z.string().min(1).max(200),
  ledgerKind: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  type: z.enum([
    'brokerage',
    'bank',
    'cash_wallet',
    'crypto_wallet',
    'pension',
    'credit_card',
    'loan',
    'property',
    'other'
  ]),
  baseCurrency: z.string().regex(/^[A-Z]{3}$/),
  institution: z.string().max(200).optional(),
  isTaxable: z.boolean().optional()
});

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.get('/accounts', async (request) => {
    const params = listQuerySchema.parse(request.query);

    const result = await query(
      `
      SELECT id, owner_id, name, ledger_kind, type, base_currency, institution, is_taxable, is_active, created_at
      FROM finance.accounts
      WHERE ($1::uuid IS NULL OR owner_id = $1)
      ORDER BY created_at DESC
      `,
      [params.ownerId ?? null]
    );

    return { data: result.rows };
  });

  app.post('/accounts', async (request, reply) => {
    const payload = createAccountSchema.parse(request.body);

    const result = await query(
      `
      INSERT INTO finance.accounts (owner_id, name, ledger_kind, type, base_currency, institution, is_taxable)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, owner_id, name, ledger_kind, type, base_currency, institution, is_taxable, is_active, created_at
      `,
      [
        payload.ownerId,
        payload.name,
        payload.ledgerKind,
        payload.type,
        payload.baseCurrency,
        payload.institution ?? null,
        payload.isTaxable ?? true
      ]
    );

    return reply.code(201).send({ data: result.rows[0] });
  });
}
