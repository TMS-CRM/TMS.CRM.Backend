import type { ErrorObject } from 'ajv';
import Ajv from 'ajv/dist/2020.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { hashObject } from './object.js';
import { BadRequestError } from '../../models/api/responses/errors.js';
import { type ExpectedQueryParam, QueryParamDataType } from '../../models/api/validations.js';

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
 * Validates and parses the path parameters.
 */
export function validateAndParsePathParams<T>(request: APIGatewayProxyEventV2, requiredPathParams: string[] = []): T {
  const parsedEvent = typeof request === 'object' ? request : (JSON.parse(request) as APIGatewayProxyEventV2);

  if (!parsedEvent.pathParameters) {
    throw new BadRequestError('Event path parameters not found');
  }

  const pathParamKeys = Object.keys(parsedEvent.pathParameters);
  const missingParams = requiredPathParams.filter((field) => !pathParamKeys.includes(field)).join(', ');

  if (missingParams) {
    throw new BadRequestError(`Missing path parameters: ${missingParams}`);
  }

  return parsedEvent.pathParameters as T;
}

/**
 * Validates and parses the request body against a JSON schema.
 */
export function validateAndParseBody<T>(request: APIGatewayProxyEventV2, schema: Record<string, unknown>): T {
  const parsedRequest = typeof request === 'object' ? request : (JSON.parse(request) as APIGatewayProxyEventV2);

  if (!parsedRequest.body) {
    throw new BadRequestError('Request body not found');
  }

  // Generate a unique identifier for the schema
  const schemaId = hashObject(schema);

  // Compile the schema if it hasn't been compiled yet
  if (!ajvValidatorStore[schemaId]) {
    ajvValidatorStore[schemaId] = ajv.compile(schema);
  }

  // Parse the event and body
  const parsedRequestBody = typeof parsedRequest.body === 'string' ? (JSON.parse(parsedRequest.body) as T) : parsedRequest.body;

  // Compile the schema and validate the body
  const ajvValidator: Ajv.ValidateFunction = ajvValidatorStore[schemaId];
  const isValid = ajvValidator(parsedRequestBody);

  // If validation fails, throw an error with detailed messages
  if (!isValid) {
    const missingFields = ajvValidator.errors
      ?.filter((error: ErrorObject) => error.keyword === 'required')
      .map((error: ErrorObject) => error.params.missingProperty as string)
      .join(', ');

    if (missingFields) {
      throw new BadRequestError(`Missing fields: ${missingFields}`);
    }

    const errors =
      ajvValidator.errors
        ?.map((error: ErrorObject) => {
          return `${error.instancePath || 'body'} ${error.message ?? 'is invalid'}`;
        })
        .join(', ') ?? 'Invalid request body';

    throw new BadRequestError(`Validation failed: ${errors}`);
  }

  return parsedRequestBody;
}

/**
 * Validates and parses the query parameters.
 */
export function validateAndParseQueryParams<T>(request: APIGatewayProxyEventV2, expectedQueryParams: ExpectedQueryParam[] = []): T {
  const parsedRequest = typeof request === 'object' ? request : (JSON.parse(request) as APIGatewayProxyEventV2);

  if (!parsedRequest.queryStringParameters) {
    throw new BadRequestError('Event query parameters not found');
  }

  const queryParamKeys = Object.keys(parsedRequest.queryStringParameters);
  const missingParams = expectedQueryParams
    .filter(({ name, required }) => required && !queryParamKeys.includes(name))
    .map(({ name }) => name)
    .join(', ');

  if (missingParams) {
    throw new BadRequestError(`Missing required query parameters: ${missingParams}`);
  }

  const validatedParams: Partial<Record<string, number | string | string[] | boolean>> = {};

  for (const { name, dataType, required, enumType } of expectedQueryParams) {
    const value = parsedRequest.queryStringParameters[name];

    if (required && value === undefined) {
      throw new BadRequestError(`Missing required query parameter: ${name}`);
    }

    if (value !== undefined) {
      validatedParams[name] = parseQueryParam(value, name, dataType, enumType);
    }
  }

  return validatedParams as T;
}

const invalidQueryParamMessage = (paramName: string): string => `Invalid query parameter: ${paramName}`;

function parseQueryParam(
  value: string,
  paramName: string,
  type: QueryParamDataType,
  enumType?: Record<string, unknown>,
): number | string | string[] | boolean {
  try {
    switch (type) {
      case QueryParamDataType.number: {
        const parsedNumber = Number(value);
        if (Number.isNaN(parsedNumber)) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }

        return parsedNumber;
      }

      case QueryParamDataType.date: {
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }

        return parsedDate.toISOString();
      }

      case QueryParamDataType.array: {
        const paramValues = value.split(',');
        const validValues = paramValues.filter((v) => v.trim() !== '');
        if (!validValues.length) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }

        return validValues;
      }

      case QueryParamDataType.boolean: {
        return value === 'true';
      }

      case QueryParamDataType.enum: {
        if (!enumType || !(value in enumType)) {
          throw new BadRequestError(invalidQueryParamMessage(paramName));
        }

        return enumType[value] as boolean;
      }

      default:
        throw new BadRequestError(`Unsupported type for parameter: ${paramName}`);
    }
  } catch {
    throw new BadRequestError(invalidQueryParamMessage(paramName));
  }
}
