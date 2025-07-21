import type { CfnParameter, CfnResource } from 'aws-cdk-lib';
import { CfnCondition, Fn } from 'aws-cdk-lib';
import {
  AmazonLinuxGeneration,
  AmazonLinuxImage,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import { AuroraPostgresEngineVersion, ClusterInstance, Credentials, DatabaseCluster, DatabaseClusterEngine } from 'aws-cdk-lib/aws-rds';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { RoleBuilder } from './role-builder.js';

export interface RdsBuilderProps {
  applicationNameUppercase: string;
  applicationNameKebabCase: string;
  vpc: IVpc;
  shouldCreateReaderInstance: boolean;
  shouldCreateEC2Param: CfnParameter;
  minCapacity?: number;
  maxCapacity?: number;
}

export class RdsBuilder extends Construct {
  public rdsSecret: ISecret;
  public rdsSecretArn: string;

  constructor(scope: Construct, id: string, props: RdsBuilderProps) {
    super(scope, id);

    // some arbitrary configuration validation on RDS capacity
    if (props.minCapacity !== undefined && (props.minCapacity < 0.5 || props.minCapacity > 2)) {
      throw new Error('minCapacity must be greater than 0.5 and less than 2');
    }

    if (props.maxCapacity !== undefined && (props.maxCapacity < 2 || props.maxCapacity > 32)) {
      throw new Error('maxCapacity must be greater than 2 and less than 32');
    }

    if (props.minCapacity !== undefined && props.maxCapacity !== undefined && props.maxCapacity < props.minCapacity) {
      throw new Error('maxCapacity must be greater than minCapacity');
    }

    // SecurityGroups
    const securityGroupRDS = new SecurityGroup(this, `${props.applicationNameUppercase}SecurityGroupRDS`, {
      vpc: props.vpc,
      allowAllOutbound: false,
      securityGroupName: `${props.applicationNameKebabCase}-security-group-RDS`,
    });
    securityGroupRDS.addEgressRule(Peer.anyIpv4(), Port.tcp(443), 'allow outgoing traffic to aws services');
    securityGroupRDS.addIngressRule(Peer.anyIpv4(), Port.tcp(5432), 'allow incoming traffic from EC2');

    // Secret
    const rdsSecretCreator: Credentials = Credentials.fromGeneratedSecret(`${props.applicationNameUppercase}Admin`, {
      secretName: `${props.applicationNameUppercase}/PostgresAdmin`,
    });

    // RDS
    const rds = new DatabaseCluster(this, `${props.applicationNameUppercase}DatabaseCluster`, {
      defaultDatabaseName: 'tms_crm',
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_15_4,
      }),
      serverlessV2MaxCapacity: props.maxCapacity,
      serverlessV2MinCapacity: props.minCapacity,
      writer: ClusterInstance.serverlessV2('writer', {}),
      readers: props.shouldCreateReaderInstance ? [ClusterInstance.serverlessV2('reader-1', { scaleWithWriter: true })] : [],
      credentials: rdsSecretCreator,
      vpc: props.vpc,
      securityGroups: [securityGroupRDS],
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
    });

    this.rdsSecret = rds.secret!;
    this.rdsSecretArn = this.rdsSecret.secretArn;

    // EC2 instance for SSM connection
    const shouldCreateEC2Condition = new CfnCondition(this, 'ShouldCreateEC2Condition', {
      expression: Fn.conditionEquals(props.shouldCreateEC2Param.valueAsString, 'true'),
    });

    // Security Group
    const securityGroupEC2 = new SecurityGroup(this, `${props.applicationNameUppercase}SecurityGroupEC2`, {
      vpc: props.vpc,
      allowAllOutbound: false,
      securityGroupName: `${props.applicationNameKebabCase}-security-group-EC2`,
    });
    securityGroupEC2.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'allow incoming traffic from SSM');
    securityGroupEC2.addEgressRule(Peer.anyIpv4(), Port.tcp(443), 'allow outgoing traffic to aws services. Needed for SSM connection');
    securityGroupEC2.addEgressRule(Peer.anyIpv4(), Port.tcp(5432), 'allow outgoing traffic to RDS');

    // Apply condition to the security group
    const securityGroupEC2Resource = securityGroupEC2.node.defaultChild as CfnResource;
    securityGroupEC2Resource.cfnOptions.condition = shouldCreateEC2Condition;

    // Role
    const roleSsmManagedInstance = new RoleBuilder(this, `${props.applicationNameUppercase}RoleBuilderSsmManagedInstance`, {
      ServicePrincipal: 'ec2.amazonaws.com',
      ManagedPolicyNames: ['service-role/AmazonEC2RoleForSSM'],
      PolicyResources: [],
      PolicyActions: [],
    });

    // EC2 Instance
    const ec2 = new Instance(this, `${props.applicationNameUppercase}EC2DbProxy`, {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      securityGroup: securityGroupEC2,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      role: roleSsmManagedInstance.role,
    });

    // Apply condition to the EC2 instance
    const ec2Resource = ec2.node.defaultChild as CfnResource;
    ec2Resource.cfnOptions.condition = shouldCreateEC2Condition;
  }
}
