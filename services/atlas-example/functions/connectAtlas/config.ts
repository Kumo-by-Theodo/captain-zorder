import { getCdkHandlerPath } from '@swarmion/serverless-helpers';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

import { sharedCdkEsbuildConfig } from '@captain-zorder/serverless-configuration';

import { connectAtlasContract } from 'contracts/connectAtlasContract';

type ConnectProps = { restApi: RestApi };

export class ConnectAtlas extends Construct {
  public connectFunction: NodejsFunction;

  constructor(scope: Construct, id: string, { restApi }: ConnectProps) {
    super(scope, id);

    this.connectFunction = new NodejsFunction(this, 'Lambda', {
      entry: getCdkHandlerPath(__dirname),
      handler: 'main',
      runtime: Runtime.NODEJS_16_X,
      architecture: Architecture.ARM_64,
      awsSdkConnectionReuse: true,
      bundling: sharedCdkEsbuildConfig,
      environment: {
        MONGO_CLUSTER_NAME: 'serverlessinstance0.zakaa',
      },
      role: Role.fromRoleArn(
        this,
        'mongodb-role',
        'arn:aws:iam::528003307471:role/mongodb-atlas-role',
      ),
    });

    restApi.root
      .resourceForPath(connectAtlasContract.path)
      .addMethod(
        connectAtlasContract.method,
        new LambdaIntegration(this.connectFunction),
      );
  }
}
