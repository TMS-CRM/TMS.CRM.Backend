import { Duration } from 'aws-cdk-lib';
import type { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import type { Role } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface LambdaBuilderProps {
  LambdaPath: string;
  LambdaName: string;
  LambdaRole: Role;
  LambdaEnv?: any;
  LambdaEventSourceSQS?: Queue;
  Dependencies?: string[];
  Vpc?: IVpc;
  VpcSubnetType?: SubnetType;
  LambdaTimeout?: Duration;
  LambdaMemory?: number;
  BatchSize?: number;
  ReportBatchItemFailures?: boolean;
}

export class LambdaBuilder extends Construct {
  public lambda: NodejsFunction;
  private props: LambdaBuilderProps;

  constructor(scope: Construct, id: string, props: LambdaBuilderProps) {
    super(scope, id);
    this.props = props;
    this.createLambda();
    this.addEventSource();

    // TODO - Add concurrency functionality
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private createLambda() {
    this.lambda = new NodejsFunction(this, 'CustomLambda', {
      entry: this.props.LambdaPath,
      functionName: this.props.LambdaName,
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      timeout: this.props.LambdaTimeout ?? Duration.seconds(60),
      role: this.props.LambdaRole,
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: this.props.Dependencies ?? undefined,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      environment: this.props.LambdaEnv ?? undefined,
      vpc: this.props.Vpc ?? undefined,
      vpcSubnets: this.props.Vpc && this.props.VpcSubnetType ? { subnetType: this.props.VpcSubnetType } : undefined,
      memorySize: this.props.LambdaMemory,
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private addEventSource() {
    if (this.props.LambdaEventSourceSQS) {
      this.lambda.addEventSource(
        new SqsEventSource(this.props.LambdaEventSourceSQS, {
          batchSize: this.props.BatchSize || 1,
          // enable the batch item failures so failed messages in the queue due to a tooEarlyError will be retried
          reportBatchItemFailures: this.props.ReportBatchItemFailures || false,
        }),
      );
    }
  }
}
