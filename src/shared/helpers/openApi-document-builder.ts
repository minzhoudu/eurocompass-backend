import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const getDocumentBuilder = (app: INestApplication<any>) => {
  const config = new DocumentBuilder()
    .setTitle('Eurocompass API')
    .setVersion('1.0')
    .build();

  return SwaggerModule.createDocument(app, config);
};
