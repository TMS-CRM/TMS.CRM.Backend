import { Fn } from 'aws-cdk-lib';
import { SecurityPolicy } from 'aws-cdk-lib/aws-apigateway';
import { CfnApi, CfnApiMapping, CfnAuthorizer, CfnDeployment, CfnDomainName, CfnIntegration, CfnRoute, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import type { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import type { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface DomainConfig {
  domainName: string;
  certificate: Certificate;
}

export interface ApiBuilderProps {
  ApiName: string;
  ApiProtocol: string;
  ApiCors: CfnApi.CorsProperty;
  StageName?: string;
  Domain?: DomainConfig;
  Region?: string;
}

export interface ApiIntegrationProps {
  Type?: string;
  Lambda: Function;
  Region?: string;
  PayloadVersion?: string;
  Timeout?: number;
}

export interface ApiAuthorizerProps {
  Name: string;
  Type: 'JWT' | 'REQUEST';
  Region?: string;
  IdentitySource: string[];
  PayloadVersion?: string;
  SimpleResponse?: boolean;
  CacheTtl?: number;
  Lambda?: Function;
  JwtConfiguration?: CfnAuthorizer.JWTConfigurationProperty;
}

export interface ApiRouteProps {
  Route: string;
  Method: string;
  AuthorizationType?: 'NONE' | 'JWT' | 'AWS_IAM' | 'CUSTOM';
  AuthorizationScopes?: string[];
  Integration: CfnIntegration;
  Authorizer?: CfnAuthorizer;
}

export class ApiBuilder extends Construct {
  public api: CfnApi;
  private principal = new ServicePrincipal('apigateway.amazonaws.com');
  private deployment: CfnDeployment;
  private stage: CfnStage;
  private domainName: CfnDomainName | null;
  private props: ApiBuilderProps;

  constructor(scope: Construct, id: string, props: ApiBuilderProps) {
    super(scope, id);
    this.props = props;
    this.domainName = null;

    // Creating api
    this.api = new CfnApi(this, 'CustomApi', {
      corsConfiguration: this.props.ApiCors,
      name: this.props.ApiName,
      protocolType: this.props.ApiProtocol,
    });

    // Adding deployment
    this.deployment = new CfnDeployment(this, 'CustomDeployment', {
      apiId: this.api.attrApiId,
    });

    // Setting stage
    this.stage = new CfnStage(this, 'customStage', {
      apiId: this.api.attrApiId,
      stageName: props.StageName ?? '$default',
      autoDeploy: true,
      deploymentId: this.deployment.attrDeploymentId,
    });

    this.setDomainName();
  }

  public addRoute(constructName: string, props: ApiRouteProps): void {
    const routeKey = `${props.Method} ${props.Route}`;
    const route = new CfnRoute(this, constructName, {
      apiId: this.api.attrApiId,
      routeKey,
      authorizationType: props.AuthorizationType,
      authorizationScopes: props.AuthorizationScopes,
      authorizerId: props.Authorizer?.attrAuthorizerId,
      target: Fn.join('/', ['integrations', props.Integration.ref]),
    });

    this.deployment.addDependency(route);
  }

  public createAuthorizer(constructName: string, props: ApiAuthorizerProps): CfnAuthorizer {
    let authorizerUri: string | undefined;

    // For a custom lambda authorizer, an authorizerUri is required
    if (props.Type === 'REQUEST' && props.Lambda && props.Region) {
      // Lambda
      authorizerUri = Fn.sub('arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${functionArn}/invocations', {
        region: props.Region,
        functionArn: props.Lambda?.functionArn,
      });

      // Grant invoke access to lambda
      props.Lambda?.grantInvoke(this.principal);
    }

    return new CfnAuthorizer(this, constructName, {
      apiId: this.api.attrApiId,
      authorizerType: props.Type,
      name: props.Name,
      authorizerPayloadFormatVersion: props.PayloadVersion,
      enableSimpleResponses: props.SimpleResponse,
      authorizerResultTtlInSeconds: props.CacheTtl,
      authorizerUri: authorizerUri,
      identitySource: props.IdentitySource,
      jwtConfiguration: props.JwtConfiguration,
    });
  }

  public createIntegration(constructName: string, props: ApiIntegrationProps): CfnIntegration {
    props.Lambda?.grantInvoke(this.principal);

    return new CfnIntegration(this, constructName, {
      apiId: this.api.attrApiId,
      integrationType: props.Type ?? 'AWS_PROXY',
      integrationUri: Fn.sub('arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${functionArn}/invocations', {
        region: props.Region ?? this.props.Region!,
        functionArn: props.Lambda.functionArn,
      }),
      payloadFormatVersion: props.PayloadVersion ?? '2.0',
      timeoutInMillis: props.Timeout ?? 30000,
    });
  }

  /** Create a custom domain name object. Attaches provided certificate */
  private setDomainName(): void {
    if (this.props.Domain) {
      const { domainName, certificate } = this.props.Domain;

      // Set dependency to wait for Certificate to be issued and validated
      this.api.node.addDependency(certificate);

      this.domainName = new CfnDomainName(this, 'CustomDomainName', {
        domainName,
        domainNameConfigurations: [
          {
            certificateArn: certificate.certificateArn,
            securityPolicy: SecurityPolicy.TLS_1_2,
          },
        ],
      });

      this.domainName.addDependency(this.stage);

      // Apply mapping
      const mapping = new CfnApiMapping(this, 'CustomApiMapping', {
        apiId: this.api.attrApiId,
        domainName: this.domainName.domainName,
        stage: this.stage.stageName,
      });

      mapping.addDependency(this.domainName);
    }
  }
}
