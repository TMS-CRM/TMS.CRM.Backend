import { CfnNetworkAcl, CfnNetworkAclEntry, CfnSubnetNetworkAclAssociation, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcBuilderProps {
  applicationName: string;
  maxAzs: number;
  natGateways: number;
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

  constructor(scope: Construct, id: string, props: VpcBuilderProps) {
    super(scope, id);

    this.vpc = new Vpc(this, `${props.applicationName}Vpc`, {
      maxAzs: props.maxAzs,
      natGateways: props.natGateways,
      subnetConfiguration: [
        {
          name: `${props.applicationName}-public`,
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: `${props.applicationName}-private-app`,
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: `${props.applicationName}-private-db`,
          subnetType: SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const dbSubnets = this.vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_ISOLATED,
    }).subnets;

    dbSubnets.forEach((subnet, index) => {
      const nacl = new CfnNetworkAcl(this, `${props.applicationName}DbNacl${index}`, {
        vpcId: this.vpc.vpcId,
      });

      new CfnSubnetNetworkAclAssociation(this, `${props.applicationName}DbNaclAssoc${index}`, {
        subnetId: subnet.subnetId,
        networkAclId: nacl.ref,
      });

      // INBOUND rules
      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclInboundVpcA${index}`, {
        egress: false,
        ruleNumber: 200,
        protocol: -1,
        cidrBlock: '10.20.4.0/22',
        ruleAction: 'allow',
        networkAclId: nacl.ref,
      });

      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclInboundVpcB${index}`, {
        egress: false,
        ruleNumber: 400,
        protocol: -1,
        cidrBlock: '10.20.8.0/22',
        ruleAction: 'allow',
        networkAclId: nacl.ref,
      });

      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclInboundEphemeral${index}`, {
        egress: false,
        ruleNumber: 5010,
        protocol: 6,
        portRange: { from: 32768, to: 65535 },
        cidrBlock: '0.0.0.0/0',
        ruleAction: 'allow',
        networkAclId: nacl.ref,
      });

      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclInboundDenyAll${index}`, {
        egress: false,
        ruleNumber: 6000,
        protocol: -1,
        ruleAction: 'deny',
        cidrBlock: '0.0.0.0/0',
        networkAclId: nacl.ref,
      });

      // OUTBOUND rules
      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclOutboundVpcA${index}`, {
        egress: true,
        ruleNumber: 200,
        protocol: -1,
        cidrBlock: '10.20.4.0/22',
        ruleAction: 'allow',
        networkAclId: nacl.ref,
      });

      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclOutboundVpcB${index}`, {
        egress: true,
        ruleNumber: 400,
        protocol: -1,
        ruleAction: 'allow',
        cidrBlock: '10.20.8.0/22',
        networkAclId: nacl.ref,
      });

      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclOutboundHttps${index}`, {
        egress: true,
        ruleNumber: 5000,
        protocol: 6,
        portRange: { from: 443, to: 443 },
        cidrBlock: '0.0.0.0/0',
        ruleAction: 'allow',
        networkAclId: nacl.ref,
      });

      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclOutboundHttp${index}`, {
        egress: true,
        ruleNumber: 5020,
        protocol: 6,
        portRange: { from: 80, to: 80 },
        cidrBlock: '0.0.0.0/0',
        ruleAction: 'allow',
        networkAclId: nacl.ref,
      });

      new CfnNetworkAclEntry(this, `${props.applicationName}DbNaclOutboundDenyAll${index}`, {
        egress: true,
        ruleNumber: 6000,
        protocol: -1,
        cidrBlock: '0.0.0.0/0',
        ruleAction: 'deny',
        networkAclId: nacl.ref,
      });
    });
  }
}
