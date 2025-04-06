import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { BadRequestError } from '../../models/api/responses/errors.js';
import { QueryParamDataType, type ExpectedQueryParam } from '../../models/api/validations.js';
import Ajv from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';
import { hashObject } from './object.js';

// Path params
export function validateAndParsePathParams<T>(request: APIGatewayProxyEventV2, requiredPathParams: string[] = []): T {
  if (!request.pathParameters) {
    throw new BadRequestError('Event path parameters not found');
  }

  const parsedEvent = typeof request === 'object' ? request : JSON.parse(request);
  const pathParamKeys = Object.keys(parsedEvent.pathParameters);
  const missingParams = requiredPathParams.filter((field) => !pathParamKeys.includes(field)).join(', ');

  if (missingParams) {
    throw new BadRequestError(`Missing path parameters: ${missingParams}`);
  }

  return parsedEvent.pathParameters as T;
}

// Initialize AJV instance globally
const ajv = new Ajv.default({
  allErrors: true, // Report all validation errors
  removeAdditional: true, // Remove additional properties not defined in the schema
  useDefaults: true, // Use default values defined in the schema
  coerceTypes: true, // Coerce types (e.g., convert strings to numbers where appropriate)
  formats: {
    'date-time': true, // Enable date-time format validation
  },
});

const ajvValidatorStore: Record<string, Ajv.ValidateFunction> = {};

/**
 * Validates and parses the request body against a JSON schema.
 */
export function validateAndParseBody<T>(request: APIGatewayProxyEventV2, schema: Record<string, unknown>): T {
  if (!request.body) {
    throw new BadRequestError('Request body not found');
  }

  // Generate a unique identifier for the schema
  const schemaId = hashObject(schema);

  // Compile the schema if it hasn't been compiled yet
  if (!ajvValidatorStore[schemaId]) {
    ajvValidatorStore[schemaId] = ajv.compile(schema);
  }

  // Parse the event and body
  const parsedRequest = typeof request === 'object' ? request : JSON.parse(request);
  const parsedRequestBody = typeof parsedRequest.body === 'string' ? JSON.parse(parsedRequest.body) : parsedRequest.body;

  // Compile the schema and validate the body
  const ajvValidator: Ajv.ValidateFunction = ajvValidatorStore[schemaId];
  const isValid = ajvValidator(parsedRequestBody);

  // If validation fails, throw an error with detailed messages
  if (!isValid) {
    const missingFields = ajvValidator.errors
      ?.filter((err: ErrorObject) => err.keyword === 'required')
      .map((err: ErrorObject) => err.params.missingProperty)
      .join(', ');

    if (missingFields) {
      throw new BadRequestError(`Missing fields: ${missingFields}`);
    }

    const errors =
      ajvValidator.errors
        ?.map((err: ErrorObject) => {
          return `${err.instancePath || 'body'} ${err.message || 'is invalid'}`;
        })
        .join(', ') || 'Invalid request body';

    throw new BadRequestError(`Validation failed: ${errors}`);
  }

  return parsedRequestBody as T;
}

// Query params
export function validateAndParseQueryParams<T>(request: APIGatewayProxyEventV2, expectedQueryParams: ExpectedQueryParam[] = []): T {
  if (!request.queryStringParameters) {
    throw new BadRequestError('Event query parameters not found');
  }

  const parsedEvent = typeof request === 'object' ? request : JSON.parse(request);
  const queryParamKeys = Object.keys(parsedEvent.queryStringParameters);
  const missingParams = expectedQueryParams
    .filter(({ name, required }) => required && !queryParamKeys.includes(name))
    .map(({ name }) => name)
    .join(', ');

  if (missingParams) {
    throw new BadRequestError(`Missing required query parameters: ${missingParams}`);
  }

  const validatedParams: Partial<Record<string, any>> = {};

  for (const { name, dataType, required, enumType } of expectedQueryParams) {
    const value = parsedEvent.queryStringParameters[name];

    if (required && value === undefined) {
      throw new BadRequestError(`Missing required query parameter: ${name}`);
    }

    switch (dataType) {
      case QueryParamDataType.number:
        validatedParams[name] = value !== undefined ? parseQueryParam(value, name, 'number') : undefined;
        break;
      case QueryParamDataType.date:
        validatedParams[name] = value !== undefined ? parseQueryParam(value, name, 'date') : undefined;
        break;
      case QueryParamDataType.array:
        validatedParams[name] = value !== undefined ? parseQueryParam(value, name, 'array') : undefined;
        break;
      case QueryParamDataType.boolean:
        validatedParams[name] = value !== undefined ? parseQueryParam(value, name, 'boolean') : undefined;
        break;
      case QueryParamDataType.enum:
        validatedParams[name] = value !== undefined ? parseQueryParam(value, name, 'enum', enumType!) : undefined;
        break;
      default:
        throw new BadRequestError(`Invalid type specified for parameter: ${name}`);
    }
  }

  return validatedParams as T;
}

const invalidQueryParamMessage = (paramName: string) => `Invalid query parameter: ${paramName}`;

function parseQueryParam(value: string, paramName: string, type: 'number' | 'date' | 'array' | 'boolean' | 'enum', enumType?: Record<string, any>) {
  try {
    switch (type) {
      case 'number':
        const parsedNumber = Number(value);
        if (Number.isNaN(parsedNumber)) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }
        return parsedNumber;
      case 'date':
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }
        return parsedDate.toISOString();
      case 'array':
        const paramValues = value.split(',');
        const validValues = paramValues.filter((v) => v.trim() !== '');
        if (!validValues.length) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }
        return validValues;
      case 'boolean':
        return value === 'true';
      case 'enum':
        if (!enumType || !(value in enumType)) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }
        return enumType[value];
      default:
        throw new BadRequestError(`Unsupported type for parameter: ${paramName}`);
    }
  } catch {
    throw new BadRequestError(invalidQueryParamMessage(paramName));
  }
}
