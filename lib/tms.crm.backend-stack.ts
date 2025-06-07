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

    const serviceNameUppercase = 'TMSCRM';
    const serviceNameKebabCase = 'tms-crm';

    const paramUrlTmsCrmApi = new CfnParameter(this, 'UrlTmsCrmApi', {
      type: 'String',
      description: 'The URL for the TMS CRM API',
    });

    // Create secure VPC
    const vpcBuilder = new VpcBuilder(this, `${serviceNameUppercase}VPC`, {
      serviceNameUppercase: serviceNameUppercase,
      serviceNameKebabCase: serviceNameKebabCase,
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
    const rdsInstance = new RdsBuilder(this, `${serviceNameUppercase}Rds`, {
      applicationNameUppercase: serviceNameUppercase,
      applicationNameKebabCase: serviceNameKebabCase,
      Vpc: vpc,
      MinCapacity: 0.5,
      MaxCapacity: 2,
      EnableReaderInstance: false,
    });

    // Cognito
    const roleCognitoPreTokenGeneration = new RoleBuilder(this, `${serviceNameUppercase}CognitoPreTokenGenerationRole`, {
      ServicePrincipal: 'lambda.amazonaws.com',
      ManagedPolicyNames: ['service-role/AWSLambdaBasicExecutionRole', 'service-role/AWSLambdaVPCAccessExecutionRole'],
      PolicyResources: [],
      PolicyActions: [],
    }).role;

    const lambdaCognitoPreTokenGeneration = new LambdaBuilder(this, `${serviceNameUppercase}CognitoPreTokenGeneration`, {
      LambdaPath: join(__dirname, '..', 'lambdas', 'api', 'auth', 'preTokenGeneration.ts'),
      LambdaName: `${serviceNameKebabCase}-cognito-pre-token-generation`,
      LambdaRole: roleCognitoPreTokenGeneration,
      LambdaEnv: {
        DATABASE_SECRET_ARN: rdsInstance.rdsSecretArn,
        LOG_LEVEL: 'info',
      },
      Dependencies: ['knex', 'pg', 'winston'],
      Vpc: vpc,
    }).lambda;

    const cognitoUserPool = new UserPool(this, `${serviceNameUppercase}UserPool`, {
      userPoolName: `${serviceNameUppercase}UserPool`,
      signInAliases: { email: true },
      lambdaTriggers: {
        preTokenGeneration: lambdaCognitoPreTokenGeneration,
      },
    });

    const userPoolClient = new UserPoolClient(this, `${serviceNameUppercase}UserPoolClient`, {
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
    new PermissionGrantor(this, `${serviceNameUppercase}PermissionGrantorDatabaseAccess`, {
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
        roleCognitoPreTokenGeneration,
        roleKnexMigration,
        roleSupportCreateTenant,
      ],
      PolicyResources: [rdsInstance.rdsSecretArn],
      PolicyActions: ['secretsmanager:GetSecretValue'],
    });

    new PermissionGrantor(this, `${serviceNameUppercase}PermissionGrantorCognitoAccess`, {
      RolesToGrant: [roleApiPostUser, roleApiAuthSignIn, roleApiAuthSignOut, roleApiAuthSwitchTenant, roleSupportCreateTenant],
      PolicyActions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:GlobalSignOut', 'cognito-idp:AdminCreateUser'],
      PolicyResources: [cognitoUserPool.userPoolArn],
    });

    // Lambdas
    const lambdaApiGetActivity = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetActivity`, {
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

    const lambdaApiGetActivities = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetActivities`, {
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

    const lambdaApiPostActivity = new LambdaBuilder(this, `${serviceNameUppercase}ApiPostActivity`, {
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

    const lambdaApiPutActivity = new LambdaBuilder(this, `${serviceNameUppercase}ApiPutActivity`, {
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

    const lambdaApiDeleteActivity = new LambdaBuilder(this, `${serviceNameUppercase}ApiDeleteActivity`, {
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

    const lambdaApiGetCustomer = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetCustomer`, {
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

    const lambdaApiGetCustomers = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetCustomers`, {
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

    const lambdaApiPostCustomer = new LambdaBuilder(this, `${serviceNameUppercase}ApiPostCustomer`, {
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

    const lambdaApiPutCustomer = new LambdaBuilder(this, `${serviceNameUppercase}ApiPutCustomer`, {
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

    const lambdaApiDeleteCustomer = new LambdaBuilder(this, `${serviceNameUppercase}ApiDeleteCustomer`, {
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

    const lambdaApiGetDeal = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetDeal`, {
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

    const lambdaApiGetDeals = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetDeals`, {
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

    const lambdaApiPostDeal = new LambdaBuilder(this, `${serviceNameUppercase}ApiPostDeal`, {
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

    const lambdaApiPutDeal = new LambdaBuilder(this, `${serviceNameUppercase}ApiPutDeal`, {
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

    const lambdaApiDeleteDeal = new LambdaBuilder(this, `${serviceNameUppercase}ApiDeleteDeal`, {
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

    const lambdaApiGetTask = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetTask`, {
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

    const lambdaApiGetTasks = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetTasks`, {
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

    const lambdaApiPostTask = new LambdaBuilder(this, `${serviceNameUppercase}ApiPostTask`, {
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

    const lambdaApiPutTask = new LambdaBuilder(this, `${serviceNameUppercase}ApiPutTask`, {
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

    const lambdaApiDeleteTask = new LambdaBuilder(this, `${serviceNameUppercase}ApiDeleteTask`, {
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

    const lambdaApiGetUser = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetUser`, {
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

    const lambdaApiGetUsers = new LambdaBuilder(this, `${serviceNameUppercase}ApiGetUsers`, {
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

    const lambdaApiPostUser = new LambdaBuilder(this, `${serviceNameUppercase}ApiPostUser`, {
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

    const lambdaApiPutUser = new LambdaBuilder(this, `${serviceNameUppercase}ApiPutUser`, {
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

    const lambdaApiDeleteUser = new LambdaBuilder(this, `${serviceNameUppercase}ApiDeleteUser`, {
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

    const lambdaApiAuthSignIn = new LambdaBuilder(this, `${serviceNameUppercase}ApiAuthSignIn`, {
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

    const lambdaApiAuthSignOut = new LambdaBuilder(this, `${serviceNameUppercase}ApiAuthSignOut`, {
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

    const lambdaApiAuthSwitchTenant = new LambdaBuilder(this, `${serviceNameUppercase}ApiAuthSwitchTenant`, {
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

    new LambdaBuilder(this, `${serviceNameUppercase}SupportCreateTenant`, {
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

    const lambdaKnexMigration = new LambdaBuilder(this, `${serviceNameUppercase}KnexMigrationLambda`, {
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
      new LayerVersion(this, `${serviceNameUppercase}KnexMigrationLambdaLayer`, {
        code: Code.fromAsset(join(__dirname, '..', 'knex')),
      }),
    );
    lambdaKnexMigration.lambda.addEnvironment('MIGRATIONS_DIR', '/opt/migrations');

    // Run the Knex migration on stack deployment
    new AwsCustomResource(this, `${serviceNameUppercase}KnexPostStackDeployment`, {
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
    const api = new ApiBuilder(this, `${serviceNameUppercase}Api`, {
      ApiName: `${serviceNameKebabCase}-api`,
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

    api.addRoute(`${serviceNameUppercase}ApiAuthSignIn`, {
      Method: 'POST',
      Route: '/auth/sign-in',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiAuthSignInIntegration`, {
        Lambda: lambdaApiAuthSignIn,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiAuthSignOut`, {
      Method: 'POST',
      Route: '/auth/sign-out',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiAuthSignOutIntegration`, {
        Lambda: lambdaApiAuthSignOut,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiAuthSwitchTenant`, {
      Method: 'POST',
      Route: '/auth/switch-tenant',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiAuthSwitchTenantIntegration`, {
        Lambda: lambdaApiAuthSwitchTenant,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetActivity`, {
      Method: 'GET',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetActivityIntegration`, {
        Lambda: lambdaApiGetActivity,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetActivities`, {
      Method: 'GET',
      Route: '/activities',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetActivitiesIntegration`, {
        Lambda: lambdaApiGetActivities,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPostActivity`, {
      Method: 'POST',
      Route: '/activities',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPostActivityIntegration`, {
        Lambda: lambdaApiPostActivity,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPutActivity`, {
      Method: 'PUT',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPutActivityIntegration`, {
        Lambda: lambdaApiPutActivity,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiDeleteActivity`, {
      Method: 'DELETE',
      Route: '/activities/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiDeleteActivityIntegration`, {
        Lambda: lambdaApiDeleteActivity,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetCustomer`, {
      Method: 'GET',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetCustomerIntegration`, {
        Lambda: lambdaApiGetCustomer,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetCustomers`, {
      Method: 'GET',
      Route: '/customers',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetCustomersIntegration`, {
        Lambda: lambdaApiGetCustomers,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPostCustomer`, {
      Method: 'POST',
      Route: '/customers',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPostCustomerIntegration`, {
        Lambda: lambdaApiPostCustomer,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPutCustomer`, {
      Method: 'PUT',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPutCustomerIntegration`, {
        Lambda: lambdaApiPutCustomer,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiDeleteCustomer`, {
      Method: 'DELETE',
      Route: '/customers/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiDeleteCustomerIntegration`, {
        Lambda: lambdaApiDeleteCustomer,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetDeal`, {
      Method: 'GET',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetDealIntegration`, {
        Lambda: lambdaApiGetDeal,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetDeals`, {
      Method: 'GET',
      Route: '/deals',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetDealsIntegration`, {
        Lambda: lambdaApiGetDeals,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPostDeal`, {
      Method: 'POST',
      Route: '/deals',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPostDealIntegration`, {
        Lambda: lambdaApiPostDeal,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPutDeal`, {
      Method: 'PUT',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPutDealIntegration`, {
        Lambda: lambdaApiPutDeal,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiDeleteDeal`, {
      Method: 'DELETE',
      Route: '/deals/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiDeleteDealIntegration`, {
        Lambda: lambdaApiDeleteDeal,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetTask`, {
      Method: 'GET',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetTaskIntegration`, {
        Lambda: lambdaApiGetTask,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetTasks`, {
      Method: 'GET',
      Route: '/tasks',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetTasksIntegration`, {
        Lambda: lambdaApiGetTasks,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPostTask`, {
      Method: 'POST',
      Route: '/tasks',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPostTaskIntegration`, {
        Lambda: lambdaApiPostTask,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPutTask`, {
      Method: 'PUT',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPutTaskIntegration`, {
        Lambda: lambdaApiPutTask,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiDeleteTask`, {
      Method: 'DELETE',
      Route: '/tasks/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiDeleteTaskIntegration`, {
        Lambda: lambdaApiDeleteTask,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetUser`, {
      Method: 'GET',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetUserIntegration`, {
        Lambda: lambdaApiGetUser,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiGetUsers`, {
      Method: 'GET',
      Route: '/users',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiGetUsersIntegration`, {
        Lambda: lambdaApiGetUsers,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPostUser`, {
      Method: 'POST',
      Route: '/users',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPostUserIntegration`, {
        Lambda: lambdaApiPostUser,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiPutUser`, {
      Method: 'PUT',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiPutUserIntegration`, {
        Lambda: lambdaApiPutUser,
      }),
    });

    api.addRoute(`${serviceNameUppercase}ApiDeleteUser`, {
      Method: 'DELETE',
      Route: '/users/{uuid}',
      Authorizer: cognitoAuthorizer,
      AuthorizationType: 'JWT',
      Integration: api.createIntegration(`${serviceNameUppercase}ApiDeleteUserIntegration`, {
        Lambda: lambdaApiDeleteUser,
      }),
    });
  }
}
