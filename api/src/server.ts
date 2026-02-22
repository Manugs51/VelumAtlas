import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';
import { env } from './env';
import { healthRoutes } from './routes/health';
import { ownerRoutes } from './routes/owners';
import { accountRoutes } from './routes/accounts';
import { instrumentRoutes } from './routes/instruments';
import { transactionRoutes } from './routes/transactions';
import { importProfileRoutes } from './routes/importProfiles';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(swagger, {
    openapi: {
      info: {
        title: 'VelumAtlas API',
        description: 'REST API for personal finance ledger and portfolio tracking',
        version: '0.1.0'
      }
    }
  });

  app.register(swaggerUi, {
    routePrefix: '/docs'
  });

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
      api.register(importProfileRoutes);
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

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
