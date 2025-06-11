import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { BadRequestError } from './responses/errors.js';
import { validateAndParseBody, validateAndParsePathParams, validateAndParseQueryParams } from '../../lib/utils/apiValidations.js';

export interface ValidatedApiRequestParams {
  request: APIGatewayProxyEventV2WithJWTAuthorizer;
  expectedAuthenticated: boolean;
  expectedPathParameter?: string;
  expectedQueryParameters?: ExpectedQueryParam[];
  expectedBodySchema?: Record<string, unknown>;
}

export class ValidatedApiRequest<T, Q = null> {
  userCognitoUuid: string | null;
  tenantUuid: string | null;
  body: T | null;
  pathParameter: string | null;
  queryParameters: Q | null;
  accessToken: string | null;
  refreshToken: string | null;

  constructor(params: ValidatedApiRequestParams) {
    this.userCognitoUuid = this.setUserCognitoUuid(params);
    this.tenantUuid = this.setTenantUuid(params);
    this.accessToken = params.request.headers.authorization?.replace('Bearer ', '') ?? null;
    this.refreshToken = params.request.headers.refreshToken ?? null;
    this.pathParameter = this.setPathParameter(params);
    this.queryParameters = this.setQueryParameters(params);
    this.body = this.setBody(params);
  }

  private setUserCognitoUuid(params: ValidatedApiRequestParams): string | null {
    if (!params.expectedAuthenticated) {
      return null;
    }

    const userCognitoUuid = params.request.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userCognitoUuid || typeof userCognitoUuid !== 'string') {
      throw new BadRequestError('User uuid not found in token');
    }

    return userCognitoUuid;
  }

  private setTenantUuid(params: ValidatedApiRequestParams): string | null {
    if (!params.expectedAuthenticated) {
      return null;
    }

    const tenantUuid = params.request.requestContext?.authorizer?.jwt?.claims?.tenantUuid;
    if (!tenantUuid || typeof tenantUuid !== 'string') {
      throw new BadRequestError('Tenant uuid not found in token');
    }

    return tenantUuid;
  }

  private setPathParameter(params: ValidatedApiRequestParams): string | null {
    if (!params.expectedPathParameter) {
      return null;
    }

    const parsedPathParams = validateAndParsePathParams<{ [param: string]: string }>(params.request, [params.expectedPathParameter]);
    return parsedPathParams[params.expectedPathParameter];
  }

  private setQueryParameters(params: ValidatedApiRequestParams): Q | null {
    if (!params.expectedQueryParameters) {
      return null;
    }

    return validateAndParseQueryParams<Q>(params.request, params.expectedQueryParameters);
  }

  private setBody(params: ValidatedApiRequestParams): T | null {
    if (!params.expectedBodySchema) {
      return null;
    }

    return validateAndParseBody<T>(params.request, params.expectedBodySchema);
  }
}

export enum QueryParamDataType {
  string,
  number,
  boolean,
  date,
  array,
  enum,
}

export interface ExpectedQueryParam {
  name: string;
  required: boolean;
  dataType: QueryParamDataType;
  enumType?: Record<string, unknown>;
}
