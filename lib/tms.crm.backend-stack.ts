import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { CfnParameter } from 'aws-cdk-lib';
import type { CfnApi } from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import type { Construct } from 'constructs';
import { ApiBuilder } from './constructs/api-gateway-builder.js';
import { LambdaBuilder } from './constructs/lambda-builder.js';
import { RdsBuilder } from './constructs/rds-builder.js';
import { RoleBuilder } from './constructs/role-builder.js';
import { VpcImporter } from './constructs/vpc-importer.js';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class TmsCrmBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a parameter for the VPC ID
    const paramVpcId = new CfnParameter(this, 'VpcId', {
      type: 'String',
      description: 'The ID of the VPC to use',
    });

    // Create a parameter for the Sentinel Auto Start tag
    const paramSentinelAutoStartTag = new CfnParameter(this, 'SentinelAutoStartTag', {
      type: 'String',
      description: 'The value for the Sentinel:AutoStart tag',
      default: 'true',
    });

    const paramUrlTmsCrmApi = new CfnParameter(this, 'UrlTmsCrmApi', {
      type: 'String',
      description: 'The URL for the TMS CRM API',
    });

    const vpcImporter = new VpcImporter(this, 'VpcImporter', {
      Name: paramVpcId.valueAsString,
    });

    const rdsInstance = new RdsBuilder(this, 'TmsCrmBackendRds', {
      ApplicationName: 'TmsCrmBackend',
      Vpc: vpcImporter,
      MinCapacity: 0.5,
      MaxCapacity: 16,
      RDSTags: {
        'Sentinel:AutoStart': paramSentinelAutoStartTag.valueAsString,
      },
      EC2Tags: {
        'Sentinel:AutoStart': paramSentinelAutoStartTag.valueAsString,
      },
    });

    const roleApiGetActivity = new RoleBuilder(this, 'RoleApiGetActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetActivity = new LambdaBuilder(this, 'tmsCrmApiGetActivity', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'activity', 'getActivity.ts'),
      LambdaName: 'tms-crm-api-get-activity',
      LambdaRole: roleApiGetActivity.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetActivities = new RoleBuilder(this, 'RoleApiGetActivities', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetActivities = new LambdaBuilder(this, 'tmsCrmApiGetActivities', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'activity', 'getActivities.ts'),
      LambdaName: 'tms-crm-api-get-activities',
      LambdaRole: roleApiGetActivities.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPostActivity = new RoleBuilder(this, 'RoleApiPostActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPostActivity = new LambdaBuilder(this, 'tmsCrmApiPostActivity', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'activity', 'postActivity.ts'),
      LambdaName: 'tms-crm-api-post-activity',
      LambdaRole: roleApiPostActivity.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPutActivity = new RoleBuilder(this, 'RoleApiPutActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPutActivity = new LambdaBuilder(this, 'tmsCrmApiPutActivity', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'activity', 'putActivity.ts'),
      LambdaName: 'tms-crm-api-put-activity',
      LambdaRole: roleApiPutActivity.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiDeleteActivity = new RoleBuilder(this, 'RoleApiDeleteActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiDeleteActivity = new LambdaBuilder(this, 'tmsCrmApiDeleteActivity', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'activity', 'deleteActivity.ts'),
      LambdaName: 'tms-crm-api-delete-activity',
      LambdaRole: roleApiDeleteActivity.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetCustomer = new RoleBuilder(this, 'RoleApiGetCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetCustomer = new LambdaBuilder(this, 'tmsCrmApiGetCustomer', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'customer', 'getCustomer.ts'),
      LambdaName: 'tms-crm-api-get-customer',
      LambdaRole: roleApiGetCustomer.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetCustomers = new RoleBuilder(this, 'RoleApiGetCustomers', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetCustomers = new LambdaBuilder(this, 'tmsCrmApiGetCustomers', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'customer', 'getCustomers.ts'),
      LambdaName: 'tms-crm-api-get-customers',
      LambdaRole: roleApiGetCustomers.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPostCustomer = new RoleBuilder(this, 'RoleApiPostCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPostCustomer = new LambdaBuilder(this, 'tmsCrmApiPostCustomer', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'customer', 'postCustomer.ts'),
      LambdaName: 'tms-crm-api-post-customer',
      LambdaRole: roleApiPostCustomer.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPutCustomer = new RoleBuilder(this, 'RoleApiPutCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPutCustomer = new LambdaBuilder(this, 'tmsCrmApiPutCustomer', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'customer', 'putCustomer.ts'),
      LambdaName: 'tms-crm-api-put-customer',
      LambdaRole: roleApiPutCustomer.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiDeleteCustomer = new RoleBuilder(this, 'RoleApiDeleteCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiDeleteCustomer = new LambdaBuilder(this, 'tmsCrmApiDeleteCustomer', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'customer', 'deleteCustomer.ts'),
      LambdaName: 'tms-crm-api-delete-customer',
      LambdaRole: roleApiDeleteCustomer.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetDeal = new RoleBuilder(this, 'RoleApiGetDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetDeal = new LambdaBuilder(this, 'tmsCrmApiGetDeal', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'deal', 'getDeal.ts'),
      LambdaName: 'tms-crm-api-get-deal',
      LambdaRole: roleApiGetDeal.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetDeals = new RoleBuilder(this, 'RoleApiGetDeals', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetDeals = new LambdaBuilder(this, 'tmsCrmApiGetDeals', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'deal', 'getDeals.ts'),
      LambdaName: 'tms-crm-api-get-deals',
      LambdaRole: roleApiGetDeals.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPostDeal = new RoleBuilder(this, 'RoleApiPostDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPostDeal = new LambdaBuilder(this, 'tmsCrmApiPostDeal', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'deal', 'postDeal.ts'),
      LambdaName: 'tms-crm-api-post-deal',
      LambdaRole: roleApiPostDeal.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPutDeal = new RoleBuilder(this, 'RoleApiPutDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPutDeal = new LambdaBuilder(this, 'tmsCrmApiPutDeal', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'deal', 'putDeal.ts'),
      LambdaName: 'tms-crm-api-put-deal',
      LambdaRole: roleApiPutDeal.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiDeleteDeal = new RoleBuilder(this, 'RoleApiDeleteDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiDeleteDeal = new LambdaBuilder(this, 'tmsCrmApiDeleteDeal', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'deal', 'deleteDeal.ts'),
      LambdaName: 'tms-crm-api-delete-deal',
      LambdaRole: roleApiDeleteDeal.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetTask = new RoleBuilder(this, 'RoleApiGetTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetTask = new LambdaBuilder(this, 'tmsCrmApiGetTask', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'task', 'getTask.ts'),
      LambdaName: 'tms-crm-api-get-task',
      LambdaRole: roleApiGetTask.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetTasks = new RoleBuilder(this, 'RoleApiGetTasks', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetTasks = new LambdaBuilder(this, 'tmsCrmApiGetTasks', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'task', 'getTasks.ts'),
      LambdaName: 'tms-crm-api-get-tasks',
      LambdaRole: roleApiGetTasks.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPostTask = new RoleBuilder(this, 'RoleApiPostTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPostTask = new LambdaBuilder(this, 'tmsCrmApiPostTask', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'task', 'postTask.ts'),
      LambdaName: 'tms-crm-api-post-task',
      LambdaRole: roleApiPostTask.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPutTask = new RoleBuilder(this, 'RoleApiPutTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPutTask = new LambdaBuilder(this, 'tmsCrmApiPutTask', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'task', 'putTask.ts'),
      LambdaName: 'tms-crm-api-put-task',
      LambdaRole: roleApiPutTask.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiDeleteTask = new RoleBuilder(this, 'RoleApiDeleteTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiDeleteTask = new LambdaBuilder(this, 'tmsCrmApiDeleteTask', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'task', 'deleteTask.ts'),
      LambdaName: 'tms-crm-api-delete-task',
      LambdaRole: roleApiDeleteTask.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetUser = new RoleBuilder(this, 'RoleApiGetUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetUser = new LambdaBuilder(this, 'tmsCrmApiGetUser', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'user', 'getUser.ts'),
      LambdaName: 'tms-crm-api-get-user',
      LambdaRole: roleApiGetUser.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiGetUsers = new RoleBuilder(this, 'RoleApiGetUsers', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiGetUsers = new LambdaBuilder(this, 'tmsCrmApiGetUsers', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'user', 'getUsers.ts'),
      LambdaName: 'tms-crm-api-get-users',
      LambdaRole: roleApiGetUsers.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPostUser = new RoleBuilder(this, 'RoleApiPostUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPostUser = new LambdaBuilder(this, 'tmsCrmApiPostUser', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'user', 'postUser.ts'),
      LambdaName: 'tms-crm-api-post-user',
      LambdaRole: roleApiPostUser.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiPutUser = new RoleBuilder(this, 'RoleApiPutUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiPutUser = new LambdaBuilder(this, 'tmsCrmApiPutUser', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'user', 'putUser.ts'),
      LambdaName: 'tms-crm-api-put-user',
      LambdaRole: roleApiPutUser.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    const roleApiDeleteUser = new RoleBuilder(this, 'RoleApiDeleteUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    });

    const lambdaApiDeleteUser = new LambdaBuilder(this, 'tmsCrmApiDeleteUser', {
      LambdaPath: join(__dirname, '..', 'lambda', 'api', 'user', 'deleteUser.ts'),
      LambdaName: 'tms-crm-api-delete-user',
      LambdaRole: roleApiDeleteUser.role,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpcImporter.vpc,
    }).lambda;

    //CORS
    const corsConfig: CfnApi.CorsProperty = {
      allowHeaders: ['origin', 'Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-Modified-On'],
      allowMethods: ['OPTIONS', 'GET', 'POST', 'DELETE'],
      allowOrigins: ['*'],
      maxAge: 300,
    };

    const certificateApi = new acm.Certificate(this, 'CertificateApi', {
      domainName: paramUrlTmsCrmApi.valueAsString,
      validation: acm.CertificateValidation.fromDns(),
    });

    const api = new ApiBuilder(this, 'payrollApi', {
      ApiName: 'tmsCrmApi',
      ApiProtocol: 'HTTP',
      ApiCors: corsConfig,
      Domain: {
        domainName: paramUrlTmsCrmApi.valueAsString,
        certificate: certificateApi,
      },
      Region: this.region,
    });

    api.addRoute('tmsCrmApiGetActivity', {
      Method: 'GET',
      Route: '/activity{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetActivityIntegration', {
        Lambda: lambdaApiGetActivity,
      }),
    });

    api.addRoute('tmsCrmApiGetActivities', {
      Method: 'GET',
      Route: '/activity',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetActivitiesIntegration', {
        Lambda: lambdaApiGetActivities,
      }),
    });

    api.addRoute('tmsCrmApiPostActivity', {
      Method: 'POST',
      Route: '/activity',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPostActivityIntegration', {
        Lambda: lambdaApiPostActivity,
      }),
    });

    api.addRoute('tmsCrmApiPutActivity', {
      Method: 'PUT',
      Route: '/activity{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPutActivityIntegration', {
        Lambda: lambdaApiPutActivity,
      }),
    });

    api.addRoute('tmsCrmApiDeleteActivity', {
      Method: 'DELETE',
      Route: '/activity{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiDeleteActivityIntegration', {
        Lambda: lambdaApiDeleteActivity,
      }),
    });

    api.addRoute('tmsCrmApiGetCustomer', {
      Method: 'GET',
      Route: '/customer{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetCustomerIntegration', {
        Lambda: lambdaApiGetCustomer,
      }),
    });

    api.addRoute('tmsCrmApiGetCustomers', {
      Method: 'GET',
      Route: '/customer',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetCustomersIntegration', {
        Lambda: lambdaApiGetCustomers,
      }),
    });

    api.addRoute('tmsCrmApiPostCustomer', {
      Method: 'POST',
      Route: '/customer',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPostCustomerIntegration', {
        Lambda: lambdaApiPostCustomer,
      }),
    });

    api.addRoute('tmsCrmApiPutCustomer', {
      Method: 'PUT',
      Route: '/customer{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPutCustomerIntegration', {
        Lambda: lambdaApiPutCustomer,
      }),
    });

    api.addRoute('tmsCrmApiDeleteCustomer', {
      Method: 'DELETE',
      Route: '/customer{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiDeleteCustomerIntegration', {
        Lambda: lambdaApiDeleteCustomer,
      }),
    });

    api.addRoute('tmsCrmApiGetDeal', {
      Method: 'GET',
      Route: '/deal{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetDealIntegration', {
        Lambda: lambdaApiGetDeal,
      }),
    });

    api.addRoute('tmsCrmApiGetDeals', {
      Method: 'GET',
      Route: '/deal',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetDealsIntegration', {
        Lambda: lambdaApiGetDeals,
      }),
    });

    api.addRoute('tmsCrmApiPostDeal', {
      Method: 'POST',
      Route: '/deal',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPostDealIntegration', {
        Lambda: lambdaApiPostDeal,
      }),
    });

    api.addRoute('tmsCrmApiPutDeal', {
      Method: 'PUT',
      Route: '/deal{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPutDealIntegration', {
        Lambda: lambdaApiPutDeal,
      }),
    });

    api.addRoute('tmsCrmApiDeleteDeal', {
      Method: 'DELETE',
      Route: '/deal{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiDeleteDealIntegration', {
        Lambda: lambdaApiDeleteDeal,
      }),
    });

    api.addRoute('tmsCrmApiGetTask', {
      Method: 'GET',
      Route: '/task{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetTaskIntegration', {
        Lambda: lambdaApiGetTask,
      }),
    });

    api.addRoute('tmsCrmApiGetTasks', {
      Method: 'GET',
      Route: '/task',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetTasksIntegration', {
        Lambda: lambdaApiGetTasks,
      }),
    });

    api.addRoute('tmsCrmApiPostTask', {
      Method: 'POST',
      Route: '/task',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPostTaskIntegration', {
        Lambda: lambdaApiPostTask,
      }),
    });

    api.addRoute('tmsCrmApiPutTask', {
      Method: 'PUT',
      Route: '/task{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPutTaskIntegration', {
        Lambda: lambdaApiPutTask,
      }),
    });

    api.addRoute('tmsCrmApiDeleteTask', {
      Method: 'DELETE',
      Route: '/task{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiDeleteTaskIntegration', {
        Lambda: lambdaApiDeleteTask,
      }),
    });

    api.addRoute('tmsCrmApiGetUser', {
      Method: 'GET',
      Route: '/user{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetUserIntegration', {
        Lambda: lambdaApiGetUser,
      }),
    });

    api.addRoute('tmsCrmApiGetUsers', {
      Method: 'GET',
      Route: '/user',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiGetUsersIntegration', {
        Lambda: lambdaApiGetUsers,
      }),
    });

    api.addRoute('tmsCrmApiPostUser', {
      Method: 'POST',
      Route: '/user',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPostUserIntegration', {
        Lambda: lambdaApiPostUser,
      }),
    });

    api.addRoute('tmsCrmApiPutUser', {
      Method: 'PUT',
      Route: '/user{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiPutUserIntegration', {
        Lambda: lambdaApiPutUser,
      }),
    });

    api.addRoute('tmsCrmApiDeleteUser', {
      Method: 'DELETE',
      Route: '/user{uuid}',
      // Authorizer: apiAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration('tmsCrmApiDeleteUserIntegration', {
        Lambda: lambdaApiDeleteUser,
      }),
    });
  }
}
