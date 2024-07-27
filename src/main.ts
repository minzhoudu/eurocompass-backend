import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

const getDocumentBuilder = (app: INestApplication<any>) => {
  const config = new DocumentBuilder()
    .setTitle('Eurocompass API')
    .setVersion('1.0')
    .build();

  return SwaggerModule.createDocument(app, config);
};

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

  await app.listen(3000);

  logger.log(`Application is running on: http://localhost:3000`);
}
bootstrap();
