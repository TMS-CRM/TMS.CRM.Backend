import { Tags } from 'aws-cdk-lib';
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
  Vpc: IVpc;
  EnableReaderInstance: boolean;
  MinCapacity?: number;
  MaxCapacity?: number;
  EC2Tags?: { [key: string]: string };
  RDSTags?: { [key: string]: string };
}

export class RdsBuilder extends Construct {
  public rdsSecret: ISecret;
  public rdsSecretArn: string;

  constructor(scope: Construct, id: string, props: RdsBuilderProps) {
    super(scope, id);

    // some arbitrary configuration validation on RDS capacity
    if (props.MinCapacity !== undefined && (props.MinCapacity < 0.5 || props.MinCapacity > 2)) {
      throw new Error('minCapacity must be greater than 0.5 and less than 2');
    }

    if (props.MaxCapacity !== undefined && (props.MaxCapacity < 2 || props.MaxCapacity > 32)) {
      throw new Error('maxCapacity must be greater than 2 and less than 32');
    }

    if (props.MinCapacity !== undefined && props.MaxCapacity !== undefined && props.MaxCapacity < props.MinCapacity) {
      throw new Error('maxCapacity must be greater than minCapacity');
    }

    // SecurityGroups
    const securityGroupRDS = new SecurityGroup(this, `${props.applicationNameUppercase}SecurityGroupRDS`, {
      vpc: props.Vpc,
      allowAllOutbound: false,
      securityGroupName: `${props.applicationNameKebabCase}-security-group-RDS`,
    });
    securityGroupRDS.addEgressRule(Peer.anyIpv4(), Port.tcp(443), 'allow outgoing traffic to aws services');
    securityGroupRDS.addIngressRule(Peer.anyIpv4(), Port.tcp(5432), 'allow incoming traffic from EC2');

    const securityGroupEC2 = new SecurityGroup(this, `${props.applicationNameUppercase}SecurityGroupEC2`, {
      vpc: props.Vpc,
      allowAllOutbound: false,
      securityGroupName: `${props.applicationNameKebabCase}-security-group-EC2`,
    });
    securityGroupEC2.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'allow incoming traffic from SSM');
    securityGroupEC2.addEgressRule(Peer.anyIpv4(), Port.tcp(443), 'allow outgoing traffic to aws services. Needed for SSM connection');
    securityGroupEC2.addEgressRule(Peer.anyIpv4(), Port.tcp(5432), 'allow outgoing traffic to RDS');

    // Role
    const roleSsmManagedInstance = new RoleBuilder(this, `${props.applicationNameUppercase}RoleBuilderSsmManagedInstance`, {
      ServicePrincipal: 'ec2.amazonaws.com',
      ManagedPolicyNames: ['service-role/AmazonEC2RoleForSSM'],
      PolicyResources: [],
      PolicyActions: [],
    });

    // EC2
    const ec2 = new Instance(this, `${props.applicationNameUppercase}EC2DbProxy`, {
      vpc: props.Vpc,
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

    // EC2 tags
    if (props.EC2Tags) {
      Object.keys(props.EC2Tags).forEach((key) => {
        Tags.of(ec2).add(key, props.EC2Tags![key]);
      });
    }

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
      serverlessV2MaxCapacity: props.MaxCapacity,
      serverlessV2MinCapacity: props.MinCapacity,
      writer: ClusterInstance.serverlessV2('writer', {}),
      readers: props.EnableReaderInstance ? [ClusterInstance.serverlessV2('reader-1', { scaleWithWriter: true })] : [],
      credentials: rdsSecretCreator,
      vpc: props.Vpc,
      securityGroups: [securityGroupRDS],
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
    });

    // RDS tags
    if (props.RDSTags) {
      Object.keys(props.RDSTags).forEach((key) => {
        Tags.of(rds).add(key, props.RDSTags![key]);
      });
    }

    this.rdsSecret = rds.secret!;
    this.rdsSecretArn = this.rdsSecret.secretArn;
  }
}
