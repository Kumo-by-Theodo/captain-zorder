import { Stack, StackProps } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import { Health } from 'functions';

interface AtlasExampleProps {
  stage: string;
}

export class AtlasExampleStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & AtlasExampleProps,
  ) {
    super(scope, id, props);

    const { stage } = props;

    const vpc = new Vpc(this, 'atlas-example-vpc', {});
    const atlasExampleApi = new RestApi(this, 'AtlasExampleApi', {
      // the stage of the API is the same as the stage of the stack
      description: `AtlasExample API - ${stage}`,
      deployOptions: {
        stageName: stage,
      },
    });

    new Health(this, 'Health', { restApi: atlasExampleApi, vpc });
  }
}
