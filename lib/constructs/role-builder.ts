import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface RoleBuilderProps {
  ServicePrincipal: string;
  ManagedPolicyNames: string[];
  PolicyResources: string[];
  PolicyActions: string[];
}

export class RoleBuilder extends Construct {
  public readonly role: Role;

  constructor(scope: Construct, id: string, props: RoleBuilderProps) {
    super(scope, id);

    this.role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal(props.ServicePrincipal),
      managedPolicies: props.ManagedPolicyNames.map((policyName) => ManagedPolicy.fromAwsManagedPolicyName(policyName)),
    });
  }
}
