import { Stack, StackProps } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { Health } from 'functions';

interface ZorderDynamodbProps {
  stage: string;
}

export class ZorderDynamodbStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & ZorderDynamodbProps,
  ) {
    super(scope, id, props);

    const { stage } = props;

    const zorderDynamodbApi = new RestApi(this, 'ZorderDynamodbApi', {
      // the stage of the API is the same as the stage of the stack
      description: `ZorderDynamodb API - ${stage}`,
      deployOptions: {
        stageName: stage,
      },
    });

    const table = new Table(this, 'ZorderDynamodbTable', {
      partitionKey: { name: 'PK', type: AttributeType.BINARY },
      sortKey: { name: 'SK', type: AttributeType.BINARY },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    new Health(this, 'Health', { restApi: zorderDynamodbApi, table });
  }
}
