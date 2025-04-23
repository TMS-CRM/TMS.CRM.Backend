import { CfnParameter, Fn } from 'aws-cdk-lib';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

const MAX_AZS = 3;

export interface VpcImporterProps {
  Name: string;
}

export class VpcImporter extends Construct {
  private vpcId: string;
  private isolatedSubnetIds: string[];
  private privateSubnetIds: string[];
  private publicSubnetIds: string[];
  private azs: string[];
  public vpc: IVpc;
  private defaultName: string;

  constructor(scope: Construct, id: string, props: VpcImporterProps) {
    super(scope, id);
    this.defaultName = props.Name;

    // VPC Id
    const vpcIdParam = new CfnParameter(this, 'vpcId', {
      type: 'AWS::SSM::Parameter::Value<String>',
      default: `/${this.defaultName}/vpc/vpcid`,
    });
    this.vpcId = vpcIdParam.valueAsString;

    // Isolated subnet (database)
    const isolatedSubnetIdsParam = new CfnParameter(this, 'isolatedSubnetId', {
      type: 'AWS::SSM::Parameter::Value<CommaDelimitedList>',
      default: `/${this.defaultName}/vpc/database-subnets`,
    });
    this.isolatedSubnetIds = isolatedSubnetIdsParam.valueAsList;

    // Private subnet
    const privateSubnetIdsParam = new CfnParameter(this, 'privateSubnetId', {
      type: 'AWS::SSM::Parameter::Value<CommaDelimitedList>',
      default: `/${this.defaultName}/vpc/private-subnets`,
    });
    this.privateSubnetIds = privateSubnetIdsParam.valueAsList;

    // Public subnet
    const publicSubnetIdsParam = new CfnParameter(this, 'publicSubnetId', {
      type: 'AWS::SSM::Parameter::Value<CommaDelimitedList>',
      default: `/${this.defaultName}/vpc/public-subnets`,
    });
    this.publicSubnetIds = publicSubnetIdsParam.valueAsList;

    // Availability Zones
    const azsParam = new CfnParameter(this, 'azs', {
      type: 'AWS::SSM::Parameter::Value<CommaDelimitedList>',
      default: `/${this.defaultName}/vpc/AZs`,
    });

    const azs = [...new Array(MAX_AZS).keys()].map((_, index) => Fn.select(index, azsParam.valueAsList));
    this.azs = azs;

    this.vpc = this.importVpc();
  }

  private importVpc(): IVpc {
    return Vpc.fromVpcAttributes(this, `${this.defaultName}-VPC`, {
      vpcId: this.vpcId,
      availabilityZones: this.azs,
      isolatedSubnetIds: this.azs.map((_, index) => Fn.select(index, this.isolatedSubnetIds)),
      privateSubnetIds: this.azs.map((_, index) => Fn.select(index, this.privateSubnetIds)),
      publicSubnetIds: this.azs.map((_, index) => Fn.select(index, this.publicSubnetIds)),
    });
  }

  public getIsolatedSubnetIds(): string[] {
    return this.azs.map((_, index) => Fn.select(index, this.isolatedSubnetIds));
  }
}
