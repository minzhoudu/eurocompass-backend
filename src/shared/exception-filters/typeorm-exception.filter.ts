import { EntityNotFoundError, QueryFailedError } from 'typeorm';

import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

@Catch(QueryFailedError, EntityNotFoundError)
export class TypeormExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception.code === '23505') {
      return response.status(409).json({
        statusCode: 409,
        message: 'Email already exists',
      });
    }

    if (exception instanceof EntityNotFoundError) {
      return response.status(404).json({
        statusCode: 404,
        message: 'Entity not found',
      });
    }

    if (exception instanceof QueryFailedError) {
      return response.status(409).json({
        statusCode: 409,
        message: exception.message,
      });
    }
  }
}
