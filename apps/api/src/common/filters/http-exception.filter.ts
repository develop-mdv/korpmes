import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || exception.message;

    const details =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).errors || null
        : null;

    this.logger.error(
      `HTTP ${status} - ${Array.isArray(message) ? message.join(', ') : message}`,
      exception.stack,
    );

    response.status(status).json({
      success: false,
      error: {
        code: status,
        message: Array.isArray(message) ? message.join(', ') : message,
        details,
      },
    });
  }
}
