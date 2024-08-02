import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { getDocumentBuilder } from '@shared';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['log', 'debug', 'error', 'warn', 'verbose'],
  });

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('swagger', app, getDocumentBuilder(app));
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(3001);

  logger.debug(`Application is running on: http://localhost:3001/swagger`);
}
bootstrap();
