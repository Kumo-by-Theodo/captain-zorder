import { getCdkHandlerPath } from '@swarmion/serverless-helpers';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

import { sharedCdkEsbuildConfig } from '@captain-zorder/serverless-configuration';

import { healthContract } from 'contracts/healthContract';

type HealthProps = { restApi: RestApi; table: Table };

export class Health extends Construct {
  public healthFunction: NodejsFunction;

  constructor(scope: Construct, id: string, { restApi, table }: HealthProps) {
    super(scope, id);

    this.healthFunction = new NodejsFunction(this, 'Lambda', {
      entry: getCdkHandlerPath(__dirname),
      handler: 'main',
      runtime: Runtime.NODEJS_16_X,
      architecture: Architecture.ARM_64,
      awsSdkConnectionReuse: true,
      bundling: sharedCdkEsbuildConfig,
      environment: { TABLE_NAME: table.tableName },
    });

    table.grantReadData(this.healthFunction);

    restApi.root
      .resourceForPath(healthContract.path)
      .addMethod(
        healthContract.method,
        new LambdaIntegration(this.healthFunction),
      );
  }
}
