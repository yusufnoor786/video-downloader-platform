import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cors from 'cors';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { logger } from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true',
    })
  );

  // Global prefix
  app.setGlobal Prefix('api');

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.info(`Application started on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  logger.error('Failed to start application', error);
  process.exit(1);
});
