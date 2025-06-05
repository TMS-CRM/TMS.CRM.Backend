import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as cdk from 'aws-cdk-lib';
import { CfnParameter } from 'aws-cdk-lib';
import type { CfnApi } from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
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

    const serviceName = 'TMS-CRM';

    const paramUrlTmsCrmApi = new CfnParameter(this, 'UrlTmsCrmApi', {
      type: 'String',
      description: 'The URL for the TMS CRM API',
    });

    // Create secure VPC
    const vpcBuilder = new VpcBuilder(this, `${serviceName}-VPC`, {
      applicationName: serviceName,
      azs: ['a', 'b'],
    });

    // Wrap as IVpc
    const vpc = Vpc.fromVpcAttributes(this, 'WrappedVpc', {
      vpcId: vpcBuilder.vpc.ref,
      availabilityZones: ['ap-southeast-2a', 'ap-southeast-2b'], // Set manually or infer
      privateSubnetIds: vpcBuilder.privateSubnets.map((s) => s.ref),
      isolatedSubnetIds: vpcBuilder.databaseSubnets.map((s) => s.ref),
      isolatedSubnetIpv4CidrBlocks: vpcBuilder.databaseSubnets.map((s) => s.ref),
    });

    // RDS
    const rdsInstance = new RdsBuilder(this, `${serviceName}Rds`, {
      ApplicationName: serviceName,
      Vpc: vpc,
      MinCapacity: 0.5,
      MaxCapacity: 2,
      EnableReaderInstance: false,
    });

    // Cognito
    const roleCognitoPreAuthentication = new RoleBuilder(this, `${serviceName}CognitoPreAuthenticationRole`, {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const lambdaCognitoPreAuthentication = new LambdaBuilder(this, `${serviceName}CognitoPreAuthentication`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'preAuthentication.ts'),
      LambdaName: `${serviceName}-cognito-pre-authentication`,
      LambdaRole: roleCognitoPreAuthentication,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const cognitoUserPool = new UserPool(this, `${serviceName}UserPool`, {
      userPoolName: `${serviceName}UserPool`,
      signInAliases: { email: true },
      lambdaTriggers: {
        preAuthentication: lambdaCognitoPreAuthentication,
      },
    });

    const userPoolClient = new UserPoolClient(this, `${serviceName}UserPoolClient`, {
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
    new PermissionGrantor(this, `${serviceName}PermissionGrantorDatabaseAccess`, {
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

    new PermissionGrantor(this, `${serviceName}PermissionGrantorCognitoAccess`, {
      RolesToGrant: [roleApiPostUser, roleApiAuthSignIn, roleApiAuthSignOut, roleApiAuthSwitchTenant, roleSupportCreateTenant],
      PolicyActions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:GlobalSignOut', 'cognito-idp:AdminCreateUser'],
      PolicyResources: [cognitoUserPool.userPoolArn],
    });

    // Lambdas
    const lambdaApiGetActivity = new LambdaBuilder(this, `${serviceName}ApiGetActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'getActivity.ts'),
      LambdaName: `${serviceName}-api-get-activity`,
      LambdaRole: roleApiGetActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetActivities = new LambdaBuilder(this, `${serviceName}ApiGetActivities`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'getActivities.ts'),
      LambdaName: `${serviceName}-api-get-activities`,
      LambdaRole: roleApiGetActivities,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostActivity = new LambdaBuilder(this, `${serviceName}ApiPostActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'postActivity.ts'),
      LambdaName: `${serviceName}-api-post-activity`,
      LambdaRole: roleApiPostActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutActivity = new LambdaBuilder(this, `${serviceName}ApiPutActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'putActivity.ts'),
      LambdaName: `${serviceName}-api-put-activity`,
      LambdaRole: roleApiPutActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteActivity = new LambdaBuilder(this, `${serviceName}ApiDeleteActivity`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'activity', 'deleteActivity.ts'),
      LambdaName: `${serviceName}-api-delete-activity`,
      LambdaRole: roleApiDeleteActivity,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetCustomer = new LambdaBuilder(this, `${serviceName}ApiGetCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'getCustomer.ts'),
      LambdaName: `${serviceName}-api-get-customer`,
      LambdaRole: roleApiGetCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetCustomers = new LambdaBuilder(this, `${serviceName}ApiGetCustomers`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'getCustomers.ts'),
      LambdaName: `${serviceName}-api-get-customers`,
      LambdaRole: roleApiGetCustomers,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostCustomer = new LambdaBuilder(this, `${serviceName}ApiPostCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'postCustomer.ts'),
      LambdaName: `${serviceName}-api-post-customer`,
      LambdaRole: roleApiPostCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutCustomer = new LambdaBuilder(this, `${serviceName}ApiPutCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'putCustomer.ts'),
      LambdaName: `${serviceName}-api-put-customer`,
      LambdaRole: roleApiPutCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteCustomer = new LambdaBuilder(this, `${serviceName}ApiDeleteCustomer`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'customer', 'deleteCustomer.ts'),
      LambdaName: `${serviceName}-api-delete-customer`,
      LambdaRole: roleApiDeleteCustomer,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetDeal = new LambdaBuilder(this, `${serviceName}ApiGetDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'getDeal.ts'),
      LambdaName: `${serviceName}-api-get-deal`,
      LambdaRole: roleApiGetDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetDeals = new LambdaBuilder(this, `${serviceName}ApiGetDeals`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'getDeals.ts'),
      LambdaName: `${serviceName}-api-get-deals`,
      LambdaRole: roleApiGetDeals,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostDeal = new LambdaBuilder(this, `${serviceName}ApiPostDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'postDeal.ts'),
      LambdaName: `${serviceName}-api-post-deal`,
      LambdaRole: roleApiPostDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutDeal = new LambdaBuilder(this, `${serviceName}ApiPutDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'putDeal.ts'),
      LambdaName: `${serviceName}-api-put-deal`,
      LambdaRole: roleApiPutDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteDeal = new LambdaBuilder(this, `${serviceName}ApiDeleteDeal`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'deal', 'deleteDeal.ts'),
      LambdaName: `${serviceName}-api-delete-deal`,
      LambdaRole: roleApiDeleteDeal,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetTask = new LambdaBuilder(this, `${serviceName}ApiGetTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'getTask.ts'),
      LambdaName: `${serviceName}-api-get-task`,
      LambdaRole: roleApiGetTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetTasks = new LambdaBuilder(this, `${serviceName}ApiGetTasks`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'getTasks.ts'),
      LambdaName: `${serviceName}-api-get-tasks`,
      LambdaRole: roleApiGetTasks,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostTask = new LambdaBuilder(this, `${serviceName}ApiPostTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'postTask.ts'),
      LambdaName: `${serviceName}-api-post-task`,
      LambdaRole: roleApiPostTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPutTask = new LambdaBuilder(this, `${serviceName}ApiPutTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'putTask.ts'),
      LambdaName: `${serviceName}-api-put-task`,
      LambdaRole: roleApiPutTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteTask = new LambdaBuilder(this, `${serviceName}ApiDeleteTask`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'task', 'deleteTask.ts'),
      LambdaName: `${serviceName}-api-delete-task`,
      LambdaRole: roleApiDeleteTask,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetUser = new LambdaBuilder(this, `${serviceName}ApiGetUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'getUser.ts'),
      LambdaName: `${serviceName}-api-get-user`,
      LambdaRole: roleApiGetUser,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiGetUsers = new LambdaBuilder(this, `${serviceName}ApiGetUsers`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'getUsers.ts'),
      LambdaName: `${serviceName}-api-get-users`,
      LambdaRole: roleApiGetUsers,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiPostUser = new LambdaBuilder(this, `${serviceName}ApiPostUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'postUser.ts'),
      LambdaName: `${serviceName}-api-post-user`,
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

    const lambdaApiPutUser = new LambdaBuilder(this, `${serviceName}ApiPutUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'putUser.ts'),
      LambdaName: `${serviceName}-api-put-user`,
      LambdaRole: roleApiPutUser,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiDeleteUser = new LambdaBuilder(this, `${serviceName}ApiDeleteUser`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'user', 'deleteUser.ts'),
      LambdaName: `${serviceName}-api-delete-user`,
      LambdaRole: roleApiDeleteUser,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiAuthSignIn = new LambdaBuilder(this, `${serviceName}ApiAuthSignIn`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'signIn.ts'),
      LambdaName: `${serviceName}-api-auth-sign-in`,
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

    const lambdaApiAuthSignOut = new LambdaBuilder(this, `${serviceName}ApiAuthSignOut`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'signOut.ts'),
      LambdaName: `${serviceName}-api-auth-sign-out`,
      LambdaRole: roleApiAuthSignOut,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const lambdaApiAuthSwitchTenant = new LambdaBuilder(this, `${serviceName}ApiAuthSwitchTenant`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'switchTenant.ts'),
      LambdaName: `${serviceName}-api-auth-switch-tenant`,
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

    new LambdaBuilder(this, `${serviceName}SupportCreateTenant`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'support', 'createTenant.ts'),
      LambdaName: `${serviceName}-support-create-tenant`,
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

    const lambdaKnexMigration = new LambdaBuilder(this, `${serviceName}KnexMigrationLambda`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'support', 'knexMigration.ts'),
      LambdaName: `${serviceName}-knex-migration`,
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
      new LayerVersion(this, `${serviceName}KnexMigrationLambdaLayer`, {
        code: Code.fromAsset(join(__dirname, '..', 'knex')),
      }),
    );
    lambdaKnexMigration.lambda.addEnvironment('MIGRATIONS_DIR', '/opt/migrations');

    // Run the Knex migration on stack deployment
    new AwsCustomResource(this, `${serviceName}KnexPostStackDeployment`, {
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
    const api = new ApiBuilder(this, `${serviceName}Api`, {
      ApiName: `${serviceName}Api`,
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

    api.addRoute(`${serviceName}ApiAuthSignIn`, {
      Method: 'POST',
      Route: '/auth/sign-in',
      Integration: api.createIntegration(`${serviceName}ApiAuthSignInIntegration`, {
        Lambda: lambdaApiAuthSignIn,
      }),
    });

    api.addRoute(`${serviceName}ApiAuthSignOut`, {
      Method: 'POST',
      Route: '/auth/sign-out',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiAuthSignOutIntegration`, {
        Lambda: lambdaApiAuthSignOut,
      }),
    });

    api.addRoute(`${serviceName}ApiAuthSwitchTenant`, {
      Method: 'POST',
      Route: '/auth/switch-tenant',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiAuthSwitchTenantIntegration`, {
        Lambda: lambdaApiAuthSwitchTenant,
      }),
    });

    api.addRoute(`${serviceName}ApiGetActivity`, {
      Method: 'GET',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetActivityIntegration`, {
        Lambda: lambdaApiGetActivity,
      }),
    });

    api.addRoute(`${serviceName}ApiGetActivities`, {
      Method: 'GET',
      Route: '/activities',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetActivitiesIntegration`, {
        Lambda: lambdaApiGetActivities,
      }),
    });

    api.addRoute(`${serviceName}ApiPostActivity`, {
      Method: 'POST',
      Route: '/activities',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPostActivityIntegration`, {
        Lambda: lambdaApiPostActivity,
      }),
    });

    api.addRoute(`${serviceName}ApiPutActivity`, {
      Method: 'PUT',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPutActivityIntegration`, {
        Lambda: lambdaApiPutActivity,
      }),
    });

    api.addRoute(`${serviceName}ApiDeleteActivity`, {
      Method: 'DELETE',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiDeleteActivityIntegration`, {
        Lambda: lambdaApiDeleteActivity,
      }),
    });

    api.addRoute(`${serviceName}ApiGetCustomer`, {
      Method: 'GET',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetCustomerIntegration`, {
        Lambda: lambdaApiGetCustomer,
      }),
    });

    api.addRoute(`${serviceName}ApiGetCustomers`, {
      Method: 'GET',
      Route: '/customers',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetCustomersIntegration`, {
        Lambda: lambdaApiGetCustomers,
      }),
    });

    api.addRoute(`${serviceName}ApiPostCustomer`, {
      Method: 'POST',
      Route: '/customers',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPostCustomerIntegration`, {
        Lambda: lambdaApiPostCustomer,
      }),
    });

    api.addRoute(`${serviceName}ApiPutCustomer`, {
      Method: 'PUT',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPutCustomerIntegration`, {
        Lambda: lambdaApiPutCustomer,
      }),
    });

    api.addRoute(`${serviceName}ApiDeleteCustomer`, {
      Method: 'DELETE',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiDeleteCustomerIntegration`, {
        Lambda: lambdaApiDeleteCustomer,
      }),
    });

    api.addRoute(`${serviceName}ApiGetDeal`, {
      Method: 'GET',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetDealIntegration`, {
        Lambda: lambdaApiGetDeal,
      }),
    });

    api.addRoute(`${serviceName}ApiGetDeals`, {
      Method: 'GET',
      Route: '/deals',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetDealsIntegration`, {
        Lambda: lambdaApiGetDeals,
      }),
    });

    api.addRoute(`${serviceName}ApiPostDeal`, {
      Method: 'POST',
      Route: '/deals',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPostDealIntegration`, {
        Lambda: lambdaApiPostDeal,
      }),
    });

    api.addRoute(`${serviceName}ApiPutDeal`, {
      Method: 'PUT',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPutDealIntegration`, {
        Lambda: lambdaApiPutDeal,
      }),
    });

    api.addRoute(`${serviceName}ApiDeleteDeal`, {
      Method: 'DELETE',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiDeleteDealIntegration`, {
        Lambda: lambdaApiDeleteDeal,
      }),
    });

    api.addRoute(`${serviceName}ApiGetTask`, {
      Method: 'GET',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetTaskIntegration`, {
        Lambda: lambdaApiGetTask,
      }),
    });

    api.addRoute(`${serviceName}ApiGetTasks`, {
      Method: 'GET',
      Route: '/tasks',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetTasksIntegration`, {
        Lambda: lambdaApiGetTasks,
      }),
    });

    api.addRoute(`${serviceName}ApiPostTask`, {
      Method: 'POST',
      Route: '/tasks',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPostTaskIntegration`, {
        Lambda: lambdaApiPostTask,
      }),
    });

    api.addRoute(`${serviceName}ApiPutTask`, {
      Method: 'PUT',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPutTaskIntegration`, {
        Lambda: lambdaApiPutTask,
      }),
    });

    api.addRoute(`${serviceName}ApiDeleteTask`, {
      Method: 'DELETE',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiDeleteTaskIntegration`, {
        Lambda: lambdaApiDeleteTask,
      }),
    });

    api.addRoute(`${serviceName}ApiGetUser`, {
      Method: 'GET',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetUserIntegration`, {
        Lambda: lambdaApiGetUser,
      }),
    });

    api.addRoute(`${serviceName}ApiGetUsers`, {
      Method: 'GET',
      Route: '/users',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiGetUsersIntegration`, {
        Lambda: lambdaApiGetUsers,
      }),
    });

    api.addRoute(`${serviceName}ApiPostUser`, {
      Method: 'POST',
      Route: '/users',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPostUserIntegration`, {
        Lambda: lambdaApiPostUser,
      }),
    });

    api.addRoute(`${serviceName}ApiPutUser`, {
      Method: 'PUT',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiPutUserIntegration`, {
        Lambda: lambdaApiPutUser,
      }),
    });

    api.addRoute(`${serviceName}ApiDeleteUser`, {
      Method: 'DELETE',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceName}ApiDeleteUserIntegration`, {
        Lambda: lambdaApiDeleteUser,
      }),
    });
  }
}
