import {
  CfnEIP,
  CfnNatGateway,
  CfnNetworkAcl,
  CfnNetworkAclEntry,
  CfnRoute,
  CfnRouteTable,
  CfnSubnetNetworkAclAssociation,
  CfnSubnetRouteTableAssociation,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcBuilderProps {
  applicationName: string;
  maxAzs: number;
  // natGateways: number;
}

/**
 * VpcBuilder creates a VPC with public, private app, and private isolated database subnets.
 *
 * The database subnets are isolated for security, with custom Network ACLs that:
 * - Allow traffic only from internal CIDRs and ephemeral ports for legitimate connections.
 * - Allow outbound HTTP/HTTPS for necessary external access.
 * - Deny all other traffic to protect the database.
 *
 * This setup ensures the database is secure yet accessible via approved paths (e.g., through EC2 via SSM).
 */
export class VpcBuilder extends Construct {
  public readonly vpc: Vpc;
  public readonly natGateway: CfnNatGateway;
  private readonly ephemeralPortFrom = 32768;
  private readonly ephemeralPortTo = 65535;
  private readonly awsEphemeralPortFrom = 1024;
  private readonly databaseCidr = '10.20.8.0/22';

  constructor(scope: Construct, id: string, props: VpcBuilderProps) {
    super(scope, id);

    this.vpc = new Vpc(this, `${props.applicationName}Vpc`, {
      maxAzs: props.maxAzs,
      natGateways: 0, // NAT is being manually created
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'database',
          subnetType: SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Create the Elastic IP for NAT Gateway
    const natEip = new CfnEIP(this, `${props.applicationName}NatEip`, {
      domain: 'vpc',
    });

    // Use the first public subnet for NAT Gateway
    const publicSubnet = this.vpc.selectSubnets({
      subnetType: SubnetType.PUBLIC,
    }).subnets[0];

    // Create NAT Gateway
    this.natGateway = new CfnNatGateway(this, `${props.applicationName}NatGateway`, {
      subnetId: publicSubnet.subnetId,
      allocationId: natEip.attrAllocationId,
    });

    // Configure Nacl's
    this.configureDatabaseNacl(props.applicationName);
    this.configurePrivateNacl(props.applicationName);
    this.configurePublicNacl(props.applicationName);

    // Configure route tables
    this.configureDatabaseRouteTable(props.applicationName);
    this.configurePublicRouteTable(props.applicationName);
    this.configurePrivateRouteTable(props.applicationName);
  }

  private configureDatabaseNacl(appName: string): void {
    const databaseNacl = new CfnNetworkAcl(this, `${appName}databaseNacl`, {
      vpcId: this.vpc.vpcId,
    });

    const databaseSubnets = this.vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_ISOLATED,
    }).subnets;

    databaseSubnets.forEach((subnet, index) => {
      new CfnSubnetNetworkAclAssociation(this, `${appName}databaseNaclAssoc${index}`, {
        subnetId: subnet.subnetId,
        networkAclId: databaseNacl.ref,
      });
    });

    // INBOUND
    new CfnNetworkAclEntry(this, `${appName}databaseNaclInboundVpcA`, {
      egress: false,
      ruleNumber: 200,
      protocol: -1,
      cidrBlock: '10.20.4.0/22',
      ruleAction: 'allow',
      networkAclId: databaseNacl.ref,
    });

    new CfnNetworkAclEntry(this, `${appName}databaseNaclInboundVpcB`, {
      egress: false,
      ruleNumber: 400,
      protocol: -1,
      cidrBlock: this.databaseCidr,
      ruleAction: 'allow',
      networkAclId: databaseNacl.ref,
    });

    new CfnNetworkAclEntry(this, `${appName}databaseNaclInboundEphemeral`, {
      egress: false,
      ruleNumber: 5010,
      protocol: 6,
      portRange: { from: this.ephemeralPortFrom, to: this.ephemeralPortTo },
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      networkAclId: databaseNacl.ref,
    });

    // OUTBOUND
    new CfnNetworkAclEntry(this, `${appName}databaseNaclOutboundVpcA`, {
      egress: true,
      ruleNumber: 200,
      protocol: -1,
      cidrBlock: '10.20.4.0/22',
      ruleAction: 'allow',
      networkAclId: databaseNacl.ref,
    });

    new CfnNetworkAclEntry(this, `${appName}databaseNaclOutboundVpcB`, {
      egress: true,
      ruleNumber: 400,
      protocol: -1,
      cidrBlock: this.databaseCidr,
      ruleAction: 'allow',
      networkAclId: databaseNacl.ref,
    });

    new CfnNetworkAclEntry(this, `${appName}databaseNaclOutboundHttps`, {
      egress: true,
      ruleNumber: 5000,
      protocol: 6,
      portRange: { from: 443, to: 443 },
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      networkAclId: databaseNacl.ref,
    });

    new CfnNetworkAclEntry(this, `${appName}databaseNaclOutboundHttp`, {
      egress: true,
      ruleNumber: 5020,
      protocol: 6,
      portRange: { from: 80, to: 80 },
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      networkAclId: databaseNacl.ref,
    });
  }

  private configurePrivateNacl(appName: string): void {
    const privateNacl = new CfnNetworkAcl(this, `${appName}PrivateNacl`, {
      vpcId: this.vpc.vpcId,
    });

    const privateSubnets = this.vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_WITH_EGRESS,
    }).subnets;

    privateSubnets.forEach((subnet, index) => {
      new CfnSubnetNetworkAclAssociation(this, `${appName}PrivateNaclAssoc${index}`, {
        subnetId: subnet.subnetId,
        networkAclId: privateNacl.ref,
      });
    });

    // INBOUND
    new CfnNetworkAclEntry(this, `${appName}PrivateIngressEphemeralFromInternet`, {
      networkAclId: privateNacl.ref,
      ruleNumber: 5010,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateIngressHttpFromPublic`, {
      networkAclId: privateNacl.ref,
      ruleNumber: 5020,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '10.20.0.0/22',
      portRange: { from: 80, to: 80 },
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateIngressHttpsFromPublic`, {
      networkAclId: privateNacl.ref,
      ruleNumber: 5021,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '10.20.0.0/22',
      portRange: { from: 443, to: 443 },
    });

    // OUTBOUND
    new CfnNetworkAclEntry(this, `${appName}PrivateEgressToDb`, {
      networkAclId: privateNacl.ref,
      ruleNumber: 4000,
      protocol: -1,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: this.databaseCidr,
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateEgressHttps`, {
      networkAclId: privateNacl.ref,
      ruleNumber: 5000,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateEgressToPublicEphemeral`, {
      networkAclId: privateNacl.ref,
      ruleNumber: 5030,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.0.0/22',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateEgressHttp`, {
      networkAclId: privateNacl.ref,
      ruleNumber: 5100,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 80, to: 80 },
    });
  }

  private configurePublicNacl(appName: string): void {
    const publicNacl = new CfnNetworkAcl(this, `${appName}PublicNacl`, {
      vpcId: this.vpc.vpcId,
    });

    const publicSubnets = this.vpc.selectSubnets({
      subnetType: SubnetType.PUBLIC,
    }).subnets;

    publicSubnets.forEach((subnet, index) => {
      new CfnSubnetNetworkAclAssociation(this, `${appName}PublicNaclAssoc${index}`, {
        subnetId: subnet.subnetId,
        networkAclId: publicNacl.ref,
      });
    });

    // INBOUND
    new CfnNetworkAclEntry(this, `${appName}DatabaseSubnetIngress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 5,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: this.databaseCidr,
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${appName}DatabaseSubnetHttpIngress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 7,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: this.databaseCidr,
      portRange: { from: 80, to: 80 },
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateSubnetIngress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 100,
      protocol: -1,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '10.20.4.0/22',
    });

    new CfnNetworkAclEntry(this, `${appName}InternetEphemeralIngress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 1150,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${appName}InternetHttpsIngress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 1350,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${appName}InternetHttpIngress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 1400,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 80, to: 80 },
    });

    // OUTBOUND
    new CfnNetworkAclEntry(this, `${appName}DatabaseSubnetEgress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 5,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: this.databaseCidr,
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${appName}DatabaseSubnetEgressDeny`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 10,
      protocol: -1,
      ruleAction: 'deny',
      egress: true,
      cidrBlock: this.databaseCidr,
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateSubnetEgress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 50,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.4.0/22',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateSubnetHttpEgress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 51,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.4.0/22',
      portRange: { from: 80, to: 80 },
    });

    new CfnNetworkAclEntry(this, `${appName}PrivateSubnetHttpsEgress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 52,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.4.0/22',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${appName}InternetEphemeralEgress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 1200,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${appName}InternetHttpsEgress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 1250,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${appName}InternetHttpEgress`, {
      networkAclId: publicNacl.ref,
      ruleNumber: 1300,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 80, to: 80 },
    });
  }

  private configurePublicRouteTable(appName: string): void {
    const publicSubnets = this.vpc.selectSubnets({ subnetType: SubnetType.PUBLIC }).subnets;
    const publicRouteTable = new CfnRouteTable(this, `${appName}PublicRouteTable`, {
      vpcId: this.vpc.vpcId,
    });

    new CfnRoute(this, `${appName}InternetGatewayRoute`, {
      routeTableId: publicRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: this.vpc.internetGatewayId!,
    });

    publicSubnets.forEach((subnet, index) => {
      new CfnSubnetRouteTableAssociation(this, `${appName}PublicSubnetAssoc${index}`, {
        routeTableId: publicRouteTable.ref,
        subnetId: subnet.subnetId,
      });
    });
  }

  private configurePrivateRouteTable(appName: string): void {
    const privateSubnets = this.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnets;
    const privateRouteTable = new CfnRouteTable(this, `${appName}PrivateRouteTable`, {
      vpcId: this.vpc.vpcId,
    });

    new CfnRoute(this, `${appName}PrivateDefaultRoute`, {
      routeTableId: privateRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: this.natGateway.ref,
    });

    privateSubnets.forEach((subnet, index) => {
      new CfnSubnetRouteTableAssociation(this, `${appName}PrivateSubnetAssoc${index}`, {
        routeTableId: privateRouteTable.ref,
        subnetId: subnet.subnetId,
      });
    });
  }

  private configureDatabaseRouteTable(appName: string): void {
    const databaseSubnets = this.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_ISOLATED }).subnets;
    const databaseRouteTable = new CfnRouteTable(this, `${appName}DatabaseRouteTable`, {
      vpcId: this.vpc.vpcId,
    });

    new CfnRoute(this, `${appName}DatabaseDefaultRoute`, {
      routeTableId: databaseRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: this.natGateway.ref,
    });

    databaseSubnets.forEach((subnet, index) => {
      new CfnSubnetRouteTableAssociation(this, `${appName}DatabaseSubnetAssoc${index}`, {
        routeTableId: databaseRouteTable.ref,
        subnetId: subnet.subnetId,
      });
    });
  }
}
