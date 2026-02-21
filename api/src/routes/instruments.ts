import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';

const createInstrumentSchema = z.object({
  kind: z.enum([
    'stock',
    'etf',
    'mutual_fund',
    'bond',
    'crypto',
    'cash',
    'property',
    'private_equity',
    'commodity',
    'option',
    'other'
  ]),
  symbol: z.string().max(30).optional(),
  ticker: z.string().max(30).optional(),
  isin: z.string().max(20).optional(),
  name: z.string().min(1).max(200),
  quoteCurrency: z.string().regex(/^[A-Z]{3}$/),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  taxCategory: z.string().max(100).optional(),
  priceSource: z.string().max(100).optional()
});

export async function instrumentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instruments', async () => {
    const result = await query(
      `
      SELECT id, kind, symbol, ticker, isin, name, quote_currency, country_code, tax_category, price_source, is_active, created_at
      FROM finance.instruments
      ORDER BY created_at DESC
      `
    );

    return { data: result.rows };
  });

  app.post('/instruments', async (request, reply) => {
    const payload = createInstrumentSchema.parse(request.body);

    const result = await query(
      `
      INSERT INTO finance.instruments (
        kind, symbol, ticker, isin, name, quote_currency, country_code, tax_category, price_source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, kind, symbol, ticker, isin, name, quote_currency, country_code, tax_category, price_source, is_active, created_at
      `,
      [
        payload.kind,
        payload.symbol ?? null,
        payload.ticker ?? null,
        payload.isin ?? null,
        payload.name,
        payload.quoteCurrency,
        payload.countryCode ?? null,
        payload.taxCategory ?? null,
        payload.priceSource ?? null
      ]
    );

    return reply.code(201).send({ data: result.rows[0] });
  });
}
