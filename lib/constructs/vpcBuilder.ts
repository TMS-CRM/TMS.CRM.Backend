import {
  CfnEIP,
  CfnInternetGateway,
  CfnNatGateway,
  CfnNetworkAcl,
  CfnNetworkAclEntry,
  CfnRoute,
  CfnRouteTable,
  CfnSubnet,
  CfnSubnetNetworkAclAssociation,
  CfnSubnetRouteTableAssociation,
  CfnVPC,
  CfnVPCGatewayAttachment,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcBuilderProps {
  serviceNameUppercase: string;
  serviceNameKebabCase: string;
  azs: string[];
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
  public readonly vpc: CfnVPC;
  public readonly publicSubnets: CfnSubnet[] = [];
  public readonly privateSubnets: CfnSubnet[] = [];
  public readonly databaseSubnets: CfnSubnet[] = [];
  public readonly natGateway: CfnNatGateway;

  private readonly vpcResourceId: string;
  private readonly ephemeralPortFrom = 32768;
  private readonly ephemeralPortTo = 65535;
  private readonly awsEphemeralPortFrom = 1024;
  private readonly databaseCidr = '10.20.8.0/22';
  private readonly defaultAvailabilityZone = 'ap-southeast-2';

  constructor(scope: Construct, id: string, props: VpcBuilderProps) {
    super(scope, id);

    this.vpcResourceId = `${props.serviceNameUppercase}VPC`;
    this.vpc = this.createVpc(props);

    this.createSubnets(props);

    const igw = this.createInternetGateway(props);
    this.natGateway = this.createNATGateway(props);

    this.configureDatabaseNACL(props);
    this.configurePrivateNACL(props);
    this.configurePublicNACL(props);

    this.configurePublicRouteTable(igw.ref, props);
    this.configurePrivateRouteTable(props);
    this.configureDatabaseRouteTable(props);
  }

  private createVpc(props: VpcBuilderProps): CfnVPC {
    return new CfnVPC(this, this.vpcResourceId, {
      cidrBlock: '10.20.0.0/20',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-vpc` }],
    });
  }

  private createSubnets(props: VpcBuilderProps): void {
    props.azs.forEach((az, index) => {
      const availabilityZone = `${this.defaultAvailabilityZone}${az}`;
      const baseCidrIndex = index * 3;

      const publicSubnet = new CfnSubnet(this, `${this.vpcResourceId}PublicSubnet${az}`, {
        vpcId: this.vpc.ref,
        cidrBlock: `10.20.${baseCidrIndex}.0/24`,
        availabilityZone: availabilityZone,
        tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-public-subnet-${availabilityZone}` }],
      });
      this.publicSubnets.push(publicSubnet);

      const privateSubnet = new CfnSubnet(this, `${this.vpcResourceId}PrivateSubnet${az}`, {
        vpcId: this.vpc.ref,
        cidrBlock: `10.20.${baseCidrIndex + 1}.0/24`,
        availabilityZone: availabilityZone,
        tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-private-subnet-${availabilityZone}` }],
      });
      this.privateSubnets.push(privateSubnet);

      const dbSubnet = new CfnSubnet(this, `${this.vpcResourceId}DatabaseSubnet${az}`, {
        vpcId: this.vpc.ref,
        cidrBlock: `10.20.${baseCidrIndex + 2}.0/24`,
        availabilityZone: availabilityZone,
        tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-database-subnet-${availabilityZone}` }],
      });
      this.databaseSubnets.push(dbSubnet);
    });
  }

  private createInternetGateway(props: VpcBuilderProps): CfnInternetGateway {
    const igw = new CfnInternetGateway(this, `${this.vpcResourceId}IGW`, {
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-igw` }],
    });

    new CfnVPCGatewayAttachment(this, `${this.vpcResourceId}IGWAttachment`, {
      vpcId: this.vpc.ref,
      internetGatewayId: igw.ref,
    });

    return igw;
  }

  private createNATGateway(props: VpcBuilderProps): CfnNatGateway {
    const natEip = new CfnEIP(this, `${this.vpcResourceId}NatEip`, {
      domain: 'vpc',
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-nat-eip` }],
    });

    return new CfnNatGateway(this, `${this.vpcResourceId}NatGateway`, {
      subnetId: this.publicSubnets[0].ref,
      allocationId: natEip.attrAllocationId,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-nat-gateway` }],
    });
  }

  // ---- NACLs ----
  private configureDatabaseNACL(props: VpcBuilderProps): void {
    const databaseNACL = new CfnNetworkAcl(this, `${this.vpcResourceId}DatabaseNACL`, {
      vpcId: this.vpc.ref,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-database-nacl` }],
    });

    this.databaseSubnets.forEach((subnet, idx) => {
      new CfnSubnetNetworkAclAssociation(this, `${this.vpcResourceId}DatabaseNACLAssoc${idx}`, {
        subnetId: subnet.ref,
        networkAclId: databaseNACL.ref,
      });
    });

    // Inbound entries
    new CfnNetworkAclEntry(this, `${this.vpcResourceId}DatabaseNACLInboundVpcA`, {
      egress: false,
      ruleNumber: 200,
      protocol: -1,
      cidrBlock: '10.20.4.0/22',
      ruleAction: 'allow',
      networkAclId: databaseNACL.ref,
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}DatabaseNACLInboundVpcB`, {
      egress: false,
      ruleNumber: 400,
      protocol: -1,
      cidrBlock: this.databaseCidr,
      ruleAction: 'allow',
      networkAclId: databaseNACL.ref,
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}DatabaseNACLInboundEphemeral`, {
      egress: false,
      ruleNumber: 5010,
      protocol: 6,
      portRange: { from: this.ephemeralPortFrom, to: this.ephemeralPortTo },
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      networkAclId: databaseNACL.ref,
    });

    // Outbound entries
    new CfnNetworkAclEntry(this, `${this.vpcResourceId}DatabaseNACLOutboundVpcA`, {
      egress: true,
      ruleNumber: 200,
      protocol: -1,
      cidrBlock: '10.20.4.0/22',
      ruleAction: 'allow',
      networkAclId: databaseNACL.ref,
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}DatabaseNACLOutboundVpcB`, {
      egress: true,
      ruleNumber: 400,
      protocol: -1,
      cidrBlock: this.databaseCidr,
      ruleAction: 'allow',
      networkAclId: databaseNACL.ref,
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}DatabaseNACLOutboundHttps`, {
      egress: true,
      ruleNumber: 5000,
      protocol: 6,
      portRange: { from: 443, to: 443 },
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      networkAclId: databaseNACL.ref,
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}DatabaseNACLOutboundHttp`, {
      egress: true,
      ruleNumber: 5020,
      protocol: 6,
      portRange: { from: 80, to: 80 },
      cidrBlock: '0.0.0.0/0',
      ruleAction: 'allow',
      networkAclId: databaseNACL.ref,
    });
  }

  private configurePrivateNACL(props: VpcBuilderProps): void {
    const privateNACL = new CfnNetworkAcl(this, `${this.vpcResourceId}PrivateNACL`, {
      vpcId: this.vpc.ref,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-private-nacl` }],
    });

    this.privateSubnets.forEach((subnet, idx) => {
      new CfnSubnetNetworkAclAssociation(this, `${this.vpcResourceId}PrivateNACLAssoc${idx}`, {
        subnetId: subnet.ref,
        networkAclId: privateNACL.ref,
      });
    });

    // Inbound entries
    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PrivateNACLInboundEphemeralFromInternet`, {
      networkAclId: privateNACL.ref,
      ruleNumber: 5010,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PrivateNACLInboundHttpFromPublic`, {
      networkAclId: privateNACL.ref,
      ruleNumber: 5020,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '10.20.0.0/22',
      portRange: { from: 80, to: 80 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PrivateNACLInboundHttpsFromPublic`, {
      networkAclId: privateNACL.ref,
      ruleNumber: 5021,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '10.20.0.0/22',
      portRange: { from: 443, to: 443 },
    });

    // Outbound entries
    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PrivateNACLOutboundToDb`, {
      networkAclId: privateNACL.ref,
      ruleNumber: 4000,
      protocol: -1,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: this.databaseCidr,
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PrivateNACLOutboundHttps`, {
      networkAclId: privateNACL.ref,
      ruleNumber: 5000,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PrivateNACLOutboundToPublicEphemeral`, {
      networkAclId: privateNACL.ref,
      ruleNumber: 5030,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.0.0/22',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PrivateNACLOutboundHttp`, {
      networkAclId: privateNACL.ref,
      ruleNumber: 5100,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 80, to: 80 },
    });
  }

  private configurePublicNACL(props: VpcBuilderProps): void {
    const publicNACL = new CfnNetworkAcl(this, `${this.vpcResourceId}PublicNACL`, {
      vpcId: this.vpc.ref,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-public-nacl` }],
    });

    this.publicSubnets.forEach((subnet, idx) => {
      new CfnSubnetNetworkAclAssociation(this, `${this.vpcResourceId}PublicNACLAssoc${idx}`, {
        subnetId: subnet.ref,
        networkAclId: publicNACL.ref,
      });
    });

    // Inbound entries
    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLInboundToDb`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 5,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: this.databaseCidr,
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLInboundHttpToDb`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 7,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: this.databaseCidr,
      portRange: { from: 80, to: 80 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLInboundToPrivate`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 100,
      protocol: -1,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '10.20.4.0/22',
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLInboundEphemeralFromInternet`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 1150,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLInboundHttpsFromInternet`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 1350,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLInboundHttpFromInternet`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 1400,
      protocol: 6,
      ruleAction: 'allow',
      egress: false,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 80, to: 80 },
    });

    // Outbound entries
    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundToDb`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 5,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: this.databaseCidr,
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundToDbDeny`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 10,
      protocol: -1,
      ruleAction: 'deny',
      egress: true,
      cidrBlock: this.databaseCidr,
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundToPrivate`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 50,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.4.0/22',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundHttpToPrivate`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 51,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.4.0/22',
      portRange: { from: 80, to: 80 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundHttpsToPrivate`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 52,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '10.20.4.0/22',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundEphemeralFromInternet`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 1200,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: this.awsEphemeralPortFrom, to: this.ephemeralPortTo },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundHttpsFromInternet`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 1250,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 443, to: 443 },
    });

    new CfnNetworkAclEntry(this, `${this.vpcResourceId}PublicNACLOutboundHttpFromInternet`, {
      networkAclId: publicNACL.ref,
      ruleNumber: 1300,
      protocol: 6,
      ruleAction: 'allow',
      egress: true,
      cidrBlock: '0.0.0.0/0',
      portRange: { from: 80, to: 80 },
    });
  }

  // ---- Route Tables ----
  private configurePublicRouteTable(igwId: string, props: VpcBuilderProps): void {
    // Create route table for public subnets
    const publicRouteTable = new CfnRouteTable(this, `${this.vpcResourceId}PublicRouteTable`, {
      vpcId: this.vpc.ref,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-public-route-table` }],
    });

    // Associate public subnets with this route table
    this.publicSubnets.forEach((subnet, idx) => {
      new CfnSubnetRouteTableAssociation(this, `${this.vpcResourceId}PublicRouteTableAssoc${idx}`, {
        subnetId: subnet.ref,
        routeTableId: publicRouteTable.ref,
      });
    });

    // Create a default route to the internet gateway
    new CfnRoute(this, `${this.vpcResourceId}PublicRouteTableDefaultRoute`, {
      routeTableId: publicRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: igwId,
    });
  }

  private configurePrivateRouteTable(props: VpcBuilderProps): void {
    // Create route table for private subnets
    const privateRouteTable = new CfnRouteTable(this, `${this.vpcResourceId}PrivateRouteTable`, {
      vpcId: this.vpc.ref,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-private-route-table` }],
    });

    // Associate private subnets with this route table
    this.privateSubnets.forEach((subnet, idx) => {
      new CfnSubnetRouteTableAssociation(this, `${this.vpcResourceId}PrivateRouteTableAssoc${idx}`, {
        subnetId: subnet.ref,
        routeTableId: privateRouteTable.ref,
      });
    });

    // Create a default route to the NAT Gateway for outbound internet access
    new CfnRoute(this, `${this.vpcResourceId}PrivateRouteTableDefaultRoute`, {
      routeTableId: privateRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: this.natGateway.ref,
    });
  }

  private configureDatabaseRouteTable(props: VpcBuilderProps): void {
    // Create route table for database subnets
    const databaseRouteTable = new CfnRouteTable(this, `${this.vpcResourceId}DatabaseRouteTable`, {
      vpcId: this.vpc.ref,
      tags: [{ key: 'Name', value: `${props.serviceNameKebabCase}-database-route-table` }],
    });

    // Associate database subnets with this route table
    this.databaseSubnets.forEach((subnet, idx) => {
      new CfnSubnetRouteTableAssociation(this, `${this.vpcResourceId}DatabaseRouteTableAssoc${idx}`, {
        subnetId: subnet.ref,
        routeTableId: databaseRouteTable.ref,
      });
    });

    // Create a default route to the NAT Gateway for outbound internet access
    new CfnRoute(this, `${this.vpcResourceId}DatabaseRouteTableDefaultRoute`, {
      routeTableId: databaseRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: this.natGateway.ref,
    });
  }
}
