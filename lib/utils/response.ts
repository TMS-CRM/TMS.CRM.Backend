import { logger } from './logger.js';
import { HttpErrorResponse } from '../../models/api/responses/errors.js';

export function toHttpErrorResponse(error: Error): HttpErrorResponse {
  logger.info(error);
  return new HttpErrorResponse(error);
}
