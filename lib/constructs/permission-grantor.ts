import type { Role } from 'aws-cdk-lib/aws-iam';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface PermissionGrantorProps {
  RolesToGrant: Role[];
  PolicyResources: string[];
  PolicyActions: string[];
}

export class PermissionGrantor extends Construct {
  private role!: Role;
  private props: PermissionGrantorProps;

  constructor(scope: Construct, id: string, props: PermissionGrantorProps) {
    super(scope, id);
    this.props = props;

    props.RolesToGrant.forEach((role) => {
      this.role = role;
      this.addToPolicy();
    });
  }

  private addToPolicy(): void {
    if (this.props.PolicyResources && this.props.PolicyResources.length > 0 && this.props.PolicyActions && this.props.PolicyActions.length > 0) {
      this.role.addToPolicy(
        new PolicyStatement({
          resources: this.props.PolicyResources,
          actions: this.props.PolicyActions,
        }),
      );
    }
  }
}
