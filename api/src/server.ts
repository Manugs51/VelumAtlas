import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { env } from './env';
import { healthRoutes } from './routes/health';
import { ownerRoutes } from './routes/owners';
import { accountRoutes } from './routes/accounts';
import { instrumentRoutes } from './routes/instruments';
import { transactionRoutes } from './routes/transactions';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation error',
        details: error.issues
      });
    }

    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });

  app.register(healthRoutes);

  app.register(
    async (api) => {
      api.register(ownerRoutes);
      api.register(accountRoutes);
      api.register(instrumentRoutes);
      api.register(transactionRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}

async function start() {
  const app = buildServer();
  await app.listen({
    host: '0.0.0.0',
    port: env.PORT
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
