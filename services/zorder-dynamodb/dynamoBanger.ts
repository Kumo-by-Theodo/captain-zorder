import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import chunk from 'lodash/chunk';
import PQueue from 'p-queue';

import { covid } from 'covid';
import { deserialize, serialize } from 'serializeBanger';

import {
  buildZAddress,
  decimalPlaces,
  parseZAddressToLatLong,
  recursiveBanger,
} from './absoluteBanger';

const client = new DynamoDBClient({ region: 'eu-west-1' });
const dbDocClient = DynamoDBDocumentClient.from(client);

export const buildBatchWriteQueue = (): PQueue =>
  new PQueue({
    // if pqueue is not very accurate, this assures the limit of 1000 WCU/sec is not reached
    // https://www.alexdebrie.com/posts/dynamodb-limits/#partition-throughput-limits
    interval: 1100,

    // this assures that there are not more than 30 calls (more conservative than the theoretical max of 40)
    // on a sliding window of 1sec, where each call uses up to 25 WCUs

    // Here we divide 30 by (2 + numberOfSecondaryIndices) to take into account the GSI WCU
    intervalCap: Math.floor(15),
    carryoverConcurrencyCount: true,
  });

const putItem = async () => {
  const batchWriteQueue = buildBatchWriteQueue();
  console.log('toto');
  const data = covid;
  await Promise.all(
    chunk(data, 25).map(batchedData =>
      batchWriteQueue.add(async () => {
        console.log('sending one batch');

        const command = new BatchWriteCommand({
          RequestItems: {
            'captain-zorder-zorder-dynamodb-dev-ZorderDynamodbTable1D715E20-16MVPH72U00XS':
              batchedData.map(item => {
                console.log('item', item);
                const [timestamp, temperature, latitude, longitude, city] =
                  item as [string, string, string, string, string];

                return {
                  PutRequest: {
                    Item: {
                      PK: Buffer.from('Covid'),
                      SK: serialize({
                        zIndex: buildZAddress(
                          parseFloat(latitude),
                          parseFloat(longitude),
                        ),
                        date: new Date(timestamp),
                      }),
                      timestamp,
                      latitude,
                      longitude,
                      temperature,
                      city,
                    },
                  },
                };
              }),
          },
        });

        await dbDocClient.send(command);
      }),
    ),
  );

  console.log('done');
};

const getItem = async () => {
  const command = new GetCommand({
    TableName:
      'captain-zorder-zorder-dynamodb-dev-ZorderDynamodbTable1D715E20-1WDNUP4L29KYD',
    Key: {
      PK: Buffer.from('ZORDER'),
      SK: serialize({
        zIndex: buildZAddress(49.38, 1.18),
        date: new Date('2022-01-01T01:00:00+01:00'),
      }),
    },
  });

  const { Item } = await dbDocClient.send(command);

  console.log('Item', Item);

  const deserializedData = deserialize(Item.SK as Uint8Array);
  console.log('deserializedData', deserializedData);

  console.log(parseZAddressToLatLong(deserializedData.zIndex));
};

const queryItems = async () => {
  const zmin = buildZAddress(47.6, 5.94);
  const zmax = buildZAddress(48.59, 7.65);

  const queries = recursiveBanger(zmin, zmax);

  const result = [];
  let totalCapacityUnit = 0;
  for (const query of queries) {
    const [queryZmin, queryZmax] = query;
    const command = new QueryCommand({
      TableName:
        'captain-zorder-zorder-dynamodb-dev-ZorderDynamodbTable1D715E20-1WDNUP4L29KYD',
      KeyConditionExpression: 'PK = :PK AND SK BETWEEN :zmin AND :zmax',
      ExpressionAttributeValues: {
        ':PK': Buffer.from('ZORDER'),
        ':zmin': serialize({
          zIndex: queryZmin,
          date: new Date(0),
        }),
        ':zmax': serialize({
          zIndex: queryZmax,
          date: new Date(),
        }),
      },
      ReturnConsumedCapacity: 'TOTAL',
    });

    const { Items = [], ConsumedCapacity } = await dbDocClient.send(command);

    if (ConsumedCapacity) {
      totalCapacityUnit += ConsumedCapacity.CapacityUnits ?? 0;
    }
    result.push(...Items);
  }

  console.log('result cities', new Set(result.map(({ city }) => city)));
  console.log('totalCapacityUnit', totalCapacityUnit);
  console.log('total queries', queries.length);
};

// void queryItems();
