import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';

const columnMappingSchema = z.object({
  bookingDate: z.number().int().nonnegative().nullable(),
  valueDate: z.number().int().nonnegative().nullable(),
  description: z.number().int().nonnegative().nullable(),
  amount: z.number().int().nonnegative().nullable(),
  currency: z.number().int().nonnegative().nullable(),
  reference: z.number().int().nonnegative().nullable(),
  runningBalance: z.number().int().nonnegative().nullable()
});

const currencyConfigSchema = z
  .object({
    mode: z.enum(['column', 'fixed']),
    fixedValue: z.string().regex(/^[A-Z]{3}$/).nullable()
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'fixed' && !value.fixedValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixedValue'],
        message: 'fixedValue is required when currency mode is fixed.'
      });
    }

    if (value.mode === 'column' && value.fixedValue !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixedValue'],
        message: 'fixedValue must be null when currency mode is column.'
      });
    }
  });

const createImportProfileSchema = z
  .object({
    profileName: z.string().trim().min(1).max(200),
    sourceFile: z.string().trim().min(1).max(500),
    sheetName: z.string().trim().min(1).max(200),
    headerRowIndex: z.number().int().nonnegative(),
    dataStartRowIndex: z.number().int().nonnegative(),
    columnMapping: columnMappingSchema,
    currency: currencyConfigSchema,
    sampleRows: z.array(z.array(z.string())).max(100)
  })
  .superRefine((value, ctx) => {
    if (value.columnMapping.bookingDate === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columnMapping', 'bookingDate'],
        message: 'bookingDate mapping is required.'
      });
    }

    if (value.columnMapping.description === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columnMapping', 'description'],
        message: 'description mapping is required.'
      });
    }

    if (value.columnMapping.amount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columnMapping', 'amount'],
        message: 'amount mapping is required.'
      });
    }

    if (value.currency.mode === 'column' && value.columnMapping.currency === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columnMapping', 'currency'],
        message: 'currency mapping is required when currency mode is column.'
      });
    }
  });

export async function importProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/import-profiles', async () => {
    const result = await query(
      `
      SELECT
        id,
        profile_name,
        source_file,
        sheet_name,
        header_row_index,
        data_start_row_index,
        column_mapping,
        currency_mode,
        fixed_currency_code,
        sample_rows,
        created_at
      FROM finance.import_profiles
      ORDER BY created_at DESC
      `
    );

    return { data: result.rows };
  });

  app.post('/import-profiles', async (request, reply) => {
    const payload = createImportProfileSchema.parse(request.body);

    const result = await query(
      `
      INSERT INTO finance.import_profiles (
        profile_name,
        source_file,
        sheet_name,
        header_row_index,
        data_start_row_index,
        column_mapping,
        currency_mode,
        fixed_currency_code,
        sample_rows
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb)
      RETURNING
        id,
        profile_name,
        source_file,
        sheet_name,
        header_row_index,
        data_start_row_index,
        column_mapping,
        currency_mode,
        fixed_currency_code,
        sample_rows,
        created_at
      `,
      [
        payload.profileName,
        payload.sourceFile,
        payload.sheetName,
        payload.headerRowIndex,
        payload.dataStartRowIndex,
        JSON.stringify(payload.columnMapping),
        payload.currency.mode,
        payload.currency.fixedValue,
        JSON.stringify(payload.sampleRows)
      ]
    );

    return reply.code(201).send({ data: result.rows[0] });
  });
}
