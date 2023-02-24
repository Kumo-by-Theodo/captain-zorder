import { App } from 'aws-cdk-lib';
import dotenv from 'dotenv';

import {
  defaultEnvironment,
  projectName,
  region,
  sharedParams,
} from '@captain-zorder/serverless-configuration';

import { AtlasExampleStack } from './stack';

dotenv.config();

const app = new App();

const stage =
  (app.node.tryGetContext('stage') as keyof typeof sharedParams | undefined) ??
  defaultEnvironment;

new AtlasExampleStack(app, `${projectName}-atlas-example-${stage}`, {
  stage,
  env: { region },
});
