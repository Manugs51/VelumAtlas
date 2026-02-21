import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';

const createOwnerSchema = z.object({
  name: z.string().min(1).max(200)
});

export async function ownerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/owners', async () => {
    const result = await query(
      `
      SELECT id, name, created_at
      FROM finance.owners
      ORDER BY created_at DESC
      `
    );
    return { data: result.rows };
  });

  app.post('/owners', async (request, reply) => {
    const payload = createOwnerSchema.parse(request.body);

    const result = await query(
      `
      INSERT INTO finance.owners (name)
      VALUES ($1)
      RETURNING id, name, created_at
      `,
      [payload.name]
    );

    return reply.code(201).send({ data: result.rows[0] });
  });
}
