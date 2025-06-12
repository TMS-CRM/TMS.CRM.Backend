import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { createFakeJwt } from '../utils/utils.js';

export class APIGatewayProxyEventBuilder {
  private event: APIGatewayProxyEventV2WithJWTAuthorizer;

  constructor() {
    this.event = {
      headers: {},
      queryStringParameters: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'apiId',
        authorizer: {
          principalId: 'principalId',
          integrationLatency: 100,
          jwt: {
            claims: {},
            scopes: [],
          },
        },
        domainName: 'domainName',
        domainPrefix: 'domainPrefix',
        http: {
          method: 'GET',
          path: '/path',
          protocol: 'HTTP/1.1',
          sourceIp: '1.2.3.4',
          userAgent: 'userAgent',
        },
        requestId: 'requestId',
        routeKey: 'routeKey',
        stage: 'stage',
        time: 'time',
        timeEpoch: 1234567890123,
      },
      body: '',
      isBase64Encoded: false,
      pathParameters: {},
      stageVariables: {},
      rawPath: '/path',
      rawQueryString: '',
      routeKey: 'routeKey',
      version: '2.0',
    };
  }

  static make(): APIGatewayProxyEventBuilder {
    return new APIGatewayProxyEventBuilder();
  }

  build(): APIGatewayProxyEventV2WithJWTAuthorizer {
    return this.event;
  }

  withPath(path: string): this {
    this.event.requestContext.http.path = path;
    this.event.rawPath = path;
    return this;
  }

  withPathParameters(params: { [key: string]: string }): this {
    this.event.pathParameters = params;
    return this;
  }

  withQueryStringParameters(params: { [key: string]: string }): this {
    this.event.queryStringParameters = params;
    return this;
  }

  withBody<T>(value: T): this {
    this.event.body = JSON.stringify(value);
    return this;
  }

  withHeaders(headers: { [key: string]: string }, override?: boolean): this {
    if (override) {
      this.event.headers = headers;
    } else {
      this.event.headers = {
        ...this.event.headers,
        ...headers,
      };
    }
    return this;
  }

  withUserAndTenant(ids: { userCognitoUuid: string; tenantUuid: string }): this {
    this.event.headers.authorization = `Bearer ${createFakeJwt(ids.tenantUuid, ids.userCognitoUuid)}`;
    this.event.requestContext.authorizer.jwt.claims = {
      sub: ids.userCognitoUuid,
      tenantUuid: ids.tenantUuid,
    };

    return this;
  }
}
