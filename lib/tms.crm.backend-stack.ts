import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as cdk from 'aws-cdk-lib';
import { CfnParameter } from 'aws-cdk-lib';
import type { CfnApi } from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import type { Construct } from 'constructs';
import { ApiBuilder } from './constructs/api-gateway-builder.js';
import { LambdaBuilder } from './constructs/lambda-builder.js';
import { PermissionGrantor } from './constructs/permission-grantor.js';
import { RdsBuilder } from './constructs/rds-builder.js';
import { RoleBuilder } from './constructs/role-builder.js';
import { VpcBuilder } from './constructs/vpcBuilder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class TmsCrmBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const serviceNamePascalCase = 'TmsCrm';
    const serviceNameCamelCase = 'tmsCrm';
    const serviceNameKebabCase = 'tms-crm';

    const paramUrlTmsCrmApi = new CfnParameter(this, 'UrlTmsCrmApi', {
      type: 'String',
      description: 'The URL for the TMS CRM API',
    });

    // Create secure VPC
    const vpc = new VpcBuilder(this, 'TmsCrmVpc', {
      applicationName: serviceNamePascalCase,
      maxAzs: 2,
      natGateways: 1,
    }).vpc;

    // RDS
    const rdsInstance = new RdsBuilder(this, `${serviceNamePascalCase}Rds`, {
      ApplicationName: serviceNamePascalCase,
      Vpc: vpc,
      MinCapacity: 0.5,
      MaxCapacity: 2,
      EnableReaderInstance: false,
    });

    // Cognito
    const roleCognitoPreAuthentication = new RoleBuilder(this, `${serviceNameCamelCase}CognitoPreAuthenticationRole`, {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const lambdaCognitoPreAuthentication = new LambdaBuilder(this, `${serviceNameCamelCase}CognitoPreAuthentication`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'preAuthentication.ts'),
      LambdaName: `${serviceNameCamelCase}-cognito-pre-authentication`,
      LambdaRole: roleCognitoPreAuthentication,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const cognitoUserPool = new UserPool(this, `${serviceNameCamelCase}UserPool`, {
      userPoolName: `${serviceNameCamelCase}UserPool`,
      signInAliases: { email: true },
      lambdaTriggers: {
        preAuthentication: lambdaCognitoPreAuthentication,
      },
    });

    const userPoolClient = new UserPoolClient(this, `${serviceNameCamelCase}UserPoolClient`, {
      userPool: cognitoUserPool,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
    });

    // Roles
    const roleApiGetActivity = new RoleBuilder(this, 'RoleApiGetActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPostActivity = new RoleBuilder(this, 'RoleApiPostActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetActivities = new RoleBuilder(this, 'RoleApiGetActivities', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPutActivity = new RoleBuilder(this, 'RoleApiPutActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiDeleteActivity = new RoleBuilder(this, 'RoleApiDeleteActivity', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetCustomer = new RoleBuilder(this, 'RoleApiGetCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetCustomers = new RoleBuilder(this, 'RoleApiGetCustomers', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPostCustomer = new RoleBuilder(this, 'RoleApiPostCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPutCustomer = new RoleBuilder(this, 'RoleApiPutCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiDeleteCustomer = new RoleBuilder(this, 'RoleApiDeleteCustomer', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetDeal = new RoleBuilder(this, 'RoleApiGetDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetDeals = new RoleBuilder(this, 'RoleApiGetDeals', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPostDeal = new RoleBuilder(this, 'RoleApiPostDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPutDeal = new RoleBuilder(this, 'RoleApiPutDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetTask = new RoleBuilder(this, 'RoleApiGetTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetTasks = new RoleBuilder(this, 'RoleApiGetTasks', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPostTask = new RoleBuilder(this, 'RoleApiPostTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPutTask = new RoleBuilder(this, 'RoleApiPutTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiDeleteDeal = new RoleBuilder(this, 'RoleApiDeleteDeal', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiDeleteTask = new RoleBuilder(this, 'RoleApiDeleteTask', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetUser = new RoleBuilder(this, 'RoleApiGetUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiGetUsers = new RoleBuilder(this, 'RoleApiGetUsers', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiPostUser = new RoleBuilder(this, 'RoleApiPostUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [cognitoUserPool.userPoolArn],
      PolicyActions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword'],
    }).role;

    const roleApiPutUser = new RoleBuilder(this, 'RoleApiPutUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiDeleteUser = new RoleBuilder(this, 'RoleApiDeleteUser', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiAuthSignIn = new RoleBuilder(this, 'RoleApiAuthSignIn', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiAuthSignOut = new RoleBuilder(this, 'RoleApiAuthSignOut', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleApiAuthSwitchTenant = new RoleBuilder(this, 'RoleApiAuthSwitchTenant', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleSupportCreateTenant = new RoleBuilder(this, 'RoleSupportCreateTenant', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const roleKnexMigration = new RoleBuilder(this, 'RoleKnexMigration', {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [rdsInstance.rdsSecretArn],
      PolicyActions: [
        'secretsmanager:GetResourcePolicy',
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
        'secretsmanager:ListSecretVersionIds',
      ],
    }).role;

    // Permissions
    new PermissionGrantor(this, `${serviceNameCamelCase}PermissionGrantorDatabaseAccess`, {
      RolesToGrant: [
        roleApiGetActivity,
        roleApiGetActivities,
        roleApiPostActivity,
        roleApiPutActivity,
        roleApiDeleteActivity,
        roleApiGetCustomer,
        roleApiGetCustomers,
        roleApiPostCustomer,
        roleApiPutCustomer,
        roleApiDeleteCustomer,
        roleApiGetDeal,
        roleApiGetDeals,
        roleApiPostDeal,
        roleApiPutDeal,
        roleApiDeleteDeal,
        roleApiGetTask,
        roleApiGetTasks,
        roleApiPostTask,
        roleApiPutTask,
        roleApiDeleteTask,
        roleApiGetUser,
        roleApiGetUsers,
        roleApiPostUser,
        roleApiPutUser,
        roleApiDeleteUser,
        roleApiAuthSignIn,
        roleApiAuthSignOut,
        roleApiAuthSwitchTenant,
        roleCognitoPreAuthentication,
        roleKnexMigration,
        roleSupportCreateTenant,
      ],
      PolicyResources: [rdsInstance.rdsSecretArn],
      PolicyActions: ['secretsmanager:GetSecretValue'],
    });

    new PermissionGrantor(this, `${serviceNameCamelCase}PermissionGrantorCognitoAccess`, {
      RolesToGrant: [roleApiPostUser, roleApiAuthSignIn, roleApiAuthSignOut, roleApiAuthSwitchTenant, roleSupportCreateTenant],
      PolicyActions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:GlobalSignOut', 'cognito-idp:AdminCreateUser'],
      PolicyResources: [cognitoUserPool.userPoolArn],
    });

    // Lambdas
    const lambdaApiGetActivity = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'getActivity.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-activity`,
      LambdaRole: roleApiGetActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetActivities = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetActivities`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'getActivities.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-activities`,
      LambdaRole: roleApiGetActivities,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostActivity = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPostActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'postActivity.ts'),
      LambdaName: `${serviceNameKebabCase}-api-post-activity`,
      LambdaRole: roleApiPostActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutActivity = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPutActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'putActivity.ts'),
      LambdaName: `${serviceNameKebabCase}-api-put-activity`,
      LambdaRole: roleApiPutActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteActivity = new LambdaBuilder(this, `${serviceNameCamelCase}ApiDeleteActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'deleteActivity.ts'),
      LambdaName: `${serviceNameKebabCase}-api-delete-activity`,
      LambdaRole: roleApiDeleteActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetCustomer = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'getCustomer.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-customer`,
      LambdaRole: roleApiGetCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetCustomers = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetCustomers`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'getCustomers.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-customers`,
      LambdaRole: roleApiGetCustomers,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostCustomer = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPostCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'postCustomer.ts'),
      LambdaName: `${serviceNameKebabCase}-api-post-customer`,
      LambdaRole: roleApiPostCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutCustomer = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPutCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'putCustomer.ts'),
      LambdaName: `${serviceNameKebabCase}-api-put-customer`,
      LambdaRole: roleApiPutCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteCustomer = new LambdaBuilder(this, `${serviceNameCamelCase}ApiDeleteCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'deleteCustomer.ts'),
      LambdaName: `${serviceNameKebabCase}-api-delete-customer`,
      LambdaRole: roleApiDeleteCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetDeal = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'getDeal.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-deal`,
      LambdaRole: roleApiGetDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetDeals = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetDeals`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'getDeals.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-deals`,
      LambdaRole: roleApiGetDeals,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostDeal = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPostDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'postDeal.ts'),
      LambdaName: `${serviceNameKebabCase}-api-post-deal`,
      LambdaRole: roleApiPostDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutDeal = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPutDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'putDeal.ts'),
      LambdaName: `${serviceNameKebabCase}-api-put-deal`,
      LambdaRole: roleApiPutDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteDeal = new LambdaBuilder(this, `${serviceNameCamelCase}ApiDeleteDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'deleteDeal.ts'),
      LambdaName: `${serviceNameKebabCase}-api-delete-deal`,
      LambdaRole: roleApiDeleteDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetTask = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'getTask.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-task`,
      LambdaRole: roleApiGetTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetTasks = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetTasks`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'getTasks.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-tasks`,
      LambdaRole: roleApiGetTasks,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostTask = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPostTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'postTask.ts'),
      LambdaName: `${serviceNameKebabCase}-api-post-task`,
      LambdaRole: roleApiPostTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutTask = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPutTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'putTask.ts'),
      LambdaName: `${serviceNameKebabCase}-api-put-task`,
      LambdaRole: roleApiPutTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteTask = new LambdaBuilder(this, `${serviceNameCamelCase}ApiDeleteTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'deleteTask.ts'),
      LambdaName: `${serviceNameKebabCase}-api-delete-task`,
      LambdaRole: roleApiDeleteTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetUser = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'getUser.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-user`,
      LambdaRole: roleApiGetUser,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetUsers = new LambdaBuilder(this, `${serviceNameCamelCase}ApiGetUsers`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'getUsers.ts'),
      LambdaName: `${serviceNameKebabCase}-api-get-users`,
      LambdaRole: roleApiGetUsers,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostUser = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPostUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'postUser.ts'),
      LambdaName: `${serviceNameKebabCase}-api-post-user`,
      LambdaRole: roleApiPostUser,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
        USER_POOL_ID: cognitoUserPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      Dependencies: ['knex', 'pg', 'winston', '@aws-sdk/client-cognito-identity-provider'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutUser = new LambdaBuilder(this, `${serviceNameCamelCase}ApiPutUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'putUser.ts'),
      LambdaName: `${serviceNameKebabCase}-api-put-user`,
      LambdaRole: roleApiPutUser,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteUser = new LambdaBuilder(this, `${serviceNameCamelCase}ApiDeleteUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'deleteUser.ts'),
      LambdaName: `${serviceNameKebabCase}-api-delete-user`,
      LambdaRole: roleApiDeleteUser,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiAuthSignIn = new LambdaBuilder(this, `${serviceNameCamelCase}ApiAuthSignIn`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'signIn.ts'),
      LambdaName: `${serviceNameKebabCase}-api-auth-sign-in`,
      LambdaRole: roleApiAuthSignIn,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
        USER_POOL_ID: cognitoUserPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiAuthSignOut = new LambdaBuilder(this, `${serviceNameCamelCase}ApiAuthSignOut`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'signOut.ts'),
      LambdaName: `${serviceNameKebabCase}-api-auth-sign-out`,
      LambdaRole: roleApiAuthSignOut,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiAuthSwitchTenant = new LambdaBuilder(this, `${serviceNameCamelCase}ApiAuthSwitchTenant`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'switchTenant.ts'),
      LambdaName: `${serviceNameKebabCase}-api-auth-switch-tenant`,
      LambdaRole: roleApiAuthSwitchTenant,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
        USER_POOL_ID: cognitoUserPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    new LambdaBuilder(this, `${serviceNameCamelCase}SupportCreateTenant`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'support', 'createTenant.ts'),
      LambdaName: `${serviceNameKebabCase}-support-create-tenant`,
      LambdaRole: roleSupportCreateTenant,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
        USER_POOL_ID: cognitoUserPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    });

    const lambdaKnexMigration = new LambdaBuilder(this, `${serviceNameCamelCase}KnexMigrationLambda`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'support', 'knexMigration.ts'),
      LambdaName: `${serviceNameKebabCase}-knex-migration`,
      LambdaRole: roleKnexMigration,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    });

    // Lambda layer to surface the Knex migration files
    lambdaKnexMigration.lambda.addLayers(
      new LayerVersion(this, `${serviceNameCamelCase}KnexMigrationLambdaLayer`, {
        code: Code.fromAsset(join(__dirname, '..', 'knex')),
      }),
    );
    lambdaKnexMigration.lambda.addEnvironment('MIGRATIONS_DIR', '/opt/migrations');

    // Run the Knex migration on stack deployment
    new AwsCustomResource(this, `${serviceNameCamelCase}KnexPostStackDeployment`, {
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          effect: Effect.ALLOW,
          resources: [lambdaKnexMigration.lambda.functionArn],
        }),
      ]),
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: lambdaKnexMigration.lambda.functionName,
          InvocationType: 'Event',
          Payload: JSON.stringify({
            direction: 'up',
          }),
        },
        physicalResourceId: PhysicalResourceId.of(Date.now().toString()),
      },
    });

    // ApiGateway
    const corsConfig: CfnApi.CorsProperty = {
      allowHeaders: ['origin', 'Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-Modified-On'],
      allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
      allowOrigins: ['*'],
      maxAge: 300,
    };

    const certificateApi = new acm.Certificate(this, 'CertificateApi', {
      domainName: paramUrlTmsCrmApi.valueAsString,
      validation: acm.CertificateValidation.fromDns(),
    });

    // ApiGateway
    const api = new ApiBuilder(this, `${serviceNameCamelCase}Api`, {
      ApiName: `${serviceNameCamelCase}Api`,
      ApiProtocol: 'HTTP',
      ApiCors: corsConfig,
      Domain: {
        domainName: paramUrlTmsCrmApi.valueAsString,
        certificate: certificateApi,
      },
      Region: this.region,
    });

    // Create the Cognito JWT authorizer
    const cognitoAuthorizer = api.createAuthorizer('CognitoAuthorizer', {
      Name: 'CognitoAuthorizer',
      Type: 'JWT',
      IdentitySource: ['$request.header.Authorization'],
      JwtConfiguration: {
        audience: [userPoolClient.userPoolClientId],
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${cognitoUserPool.userPoolId}`,
      },
    });

    api.addRoute(`${serviceNameCamelCase}ApiAuthSignIn`, {
      Method: 'POST',
      Route: '/auth/sign-in',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiAuthSignInIntegration`, {
        Lambda: lambdaApiAuthSignIn,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiAuthSignOut`, {
      Method: 'POST',
      Route: '/auth/sign-out',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiAuthSignOutIntegration`, {
        Lambda: lambdaApiAuthSignOut,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiAuthSwitchTenant`, {
      Method: 'POST',
      Route: '/auth/switch-tenant',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiAuthSwitchTenantIntegration`, {
        Lambda: lambdaApiAuthSwitchTenant,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetActivity`, {
      Method: 'GET',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetActivityIntegration`, {
        Lambda: lambdaApiGetActivity,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetActivities`, {
      Method: 'GET',
      Route: '/activities',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetActivitiesIntegration`, {
        Lambda: lambdaApiGetActivities,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPostActivity`, {
      Method: 'POST',
      Route: '/activities',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPostActivityIntegration`, {
        Lambda: lambdaApiPostActivity,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPutActivity`, {
      Method: 'PUT',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPutActivityIntegration`, {
        Lambda: lambdaApiPutActivity,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiDeleteActivity`, {
      Method: 'DELETE',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiDeleteActivityIntegration`, {
        Lambda: lambdaApiDeleteActivity,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetCustomer`, {
      Method: 'GET',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetCustomerIntegration`, {
        Lambda: lambdaApiGetCustomer,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetCustomers`, {
      Method: 'GET',
      Route: '/customers',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetCustomersIntegration`, {
        Lambda: lambdaApiGetCustomers,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPostCustomer`, {
      Method: 'POST',
      Route: '/customers',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPostCustomerIntegration`, {
        Lambda: lambdaApiPostCustomer,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPutCustomer`, {
      Method: 'PUT',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPutCustomerIntegration`, {
        Lambda: lambdaApiPutCustomer,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiDeleteCustomer`, {
      Method: 'DELETE',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiDeleteCustomerIntegration`, {
        Lambda: lambdaApiDeleteCustomer,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetDeal`, {
      Method: 'GET',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetDealIntegration`, {
        Lambda: lambdaApiGetDeal,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetDeals`, {
      Method: 'GET',
      Route: '/deals',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetDealsIntegration`, {
        Lambda: lambdaApiGetDeals,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPostDeal`, {
      Method: 'POST',
      Route: '/deals',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPostDealIntegration`, {
        Lambda: lambdaApiPostDeal,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPutDeal`, {
      Method: 'PUT',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPutDealIntegration`, {
        Lambda: lambdaApiPutDeal,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiDeleteDeal`, {
      Method: 'DELETE',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiDeleteDealIntegration`, {
        Lambda: lambdaApiDeleteDeal,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetTask`, {
      Method: 'GET',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetTaskIntegration`, {
        Lambda: lambdaApiGetTask,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetTasks`, {
      Method: 'GET',
      Route: '/tasks',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetTasksIntegration`, {
        Lambda: lambdaApiGetTasks,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPostTask`, {
      Method: 'POST',
      Route: '/tasks',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPostTaskIntegration`, {
        Lambda: lambdaApiPostTask,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPutTask`, {
      Method: 'PUT',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPutTaskIntegration`, {
        Lambda: lambdaApiPutTask,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiDeleteTask`, {
      Method: 'DELETE',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiDeleteTaskIntegration`, {
        Lambda: lambdaApiDeleteTask,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetUser`, {
      Method: 'GET',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetUserIntegration`, {
        Lambda: lambdaApiGetUser,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiGetUsers`, {
      Method: 'GET',
      Route: '/users',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiGetUsersIntegration`, {
        Lambda: lambdaApiGetUsers,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPostUser`, {
      Method: 'POST',
      Route: '/users',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPostUserIntegration`, {
        Lambda: lambdaApiPostUser,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiPutUser`, {
      Method: 'PUT',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiPutUserIntegration`, {
        Lambda: lambdaApiPutUser,
      }),
    });

    api.addRoute(`${serviceNameCamelCase}ApiDeleteUser`, {
      Method: 'DELETE',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameCamelCase}ApiDeleteUserIntegration`, {
        Lambda: lambdaApiDeleteUser,
      }),
    });
  }
}
