import { getHandler, HttpStatusCodes } from '@swarmion/serverless-contracts';
import { MongoClient } from 'mongodb';

import { connectAtlasContract } from 'contracts/connectAtlasContract';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
const encodedAccessKeySecret = process.env.AWS_SECRET_ACCESS_KEY ?? '';
const combo = `${accessKeyId}:${encodedAccessKeySecret}`;
const uri = new URL(
  `mongodb+srv://${combo}@${process.env.MONGO_CLUSTER_NAME ?? ''}.mongodb.net`,
);
uri.searchParams.set('retryWrites', 'true');
uri.searchParams.set('w', 'majority');

const client = new MongoClient(uri.toString(), {
  auth: {
    username: process.env.AWS_ACCESS_KEY_ID,
    password: process.env.AWS_SECRET_ACCESS_KEY,
  },
  authSource: '$external',
  authMechanism: 'MONGODB-AWS',
});
export const main = getHandler(connectAtlasContract)(async () => {
  const databases = await client.db('admin').command({ listDatabases: 1 });

  return {
    statusCode: HttpStatusCodes.OK,
    body: databases,
  };
});
