import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  catch(exception: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(
      `Database query failed: ${exception.message}`,
      exception.stack,
    );

    const { status, message } = this.mapError(exception);

    response.status(status).json({
      success: false,
      error: {
        code: status,
        message,
        details: null,
      },
    });
  }

  private mapError(exception: QueryFailedError & { code?: string }): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case '23505':
        return {
          status: 409,
          message: 'A record with the given unique constraint already exists',
        };
      case '23503':
        return {
          status: 400,
          message: 'Referenced record does not exist (foreign key violation)',
        };
      case '23502':
        return {
          status: 400,
          message: 'A required field is missing (not-null violation)',
        };
      case '22P02':
        return {
          status: 400,
          message: 'Invalid input syntax',
        };
      default:
        return {
          status: 500,
          message: 'Internal database error',
        };
    }
  }
}
