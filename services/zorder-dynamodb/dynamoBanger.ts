/*eslint-disable max-lines*/
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { writeFileSync } from 'fs';
import chunk from 'lodash/chunk';
import PQueue from 'p-queue';

import { covid } from 'covid';
import {
  floatingPointPrecision as bigPrecision,
  deserialize,
  serialize,
} from 'serializeBanger';
import {
  buildZAddress,
  convertZAddress,
  getPaddingFromPrecision,
  parseZAddressToLatLong,
} from 'utilsBanger';

import { absoluteBanger } from './absoluteBanger';

const bigPadding = getPaddingFromPrecision(bigPrecision);

const client = new DynamoDBClient({ region: 'eu-west-1' });
const dbDocClient = DynamoDBDocumentClient.from(client);

const buildBatchWriteQueue = (): PQueue =>
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
                const [name, city, timestamp, latlong] = item as [
                  string,
                  string,
                  string,
                  string,
                ];

                const [latitude, longitude] = latlong.split(', ') as [
                  string,
                  string,
                ];

                return {
                  PutRequest: {
                    Item: {
                      PK: Buffer.from('Covid'),
                      SK: serialize({
                        zIndex: buildZAddress(
                          parseFloat(latitude),
                          parseFloat(longitude),
                          bigPrecision,
                        ),
                        date: new Date(timestamp),
                      }),
                      timestamp,
                      latitude,
                      longitude,
                      city,
                      name,
                    },
                  },
                };
              }),
          },
        });

        try {
          await dbDocClient.send(command);
        } catch (e) {
          console.log('cheh');
        }
      }),
    ),
  );

  console.log('done');
};

const getItem = async () => {
  const command = new GetCommand({
    TableName:
      'captain-zorder-zorder-dynamodb-dev-ZorderDynamodbTable1D715E20-16MVPH72U00XS',
    Key: {
      PK: Buffer.from('Covid'),
      SK: serialize({
        zIndex: buildZAddress(49.38, 1.18, bigPrecision),
        date: new Date('2022-01-01T01:00:00+01:00'),
      }),
    },
  });

  const { Item } = await dbDocClient.send(command);

  console.log('Item', Item);

  const deserializedData = deserialize(Item.SK as Uint8Array);
  console.log('deserializedData', deserializedData);

  console.log(parseZAddressToLatLong(deserializedData.zIndex, bigPrecision));
};

const queryItems = async (
  recursiveBanger: (zMin: string, zMax: string) => [string, string][],
  smallPrecision: number,
  searchBox: readonly [[number, number], [number, number]],
) => {
  const smallPadding = getPaddingFromPrecision(smallPrecision);
  const startTime = new Date();

  const [[latMin, longMin], [latMax, longMax]] = searchBox;

  const zmin = buildZAddress(latMin, longMin, bigPrecision);
  const zmax = buildZAddress(latMax, longMax, bigPrecision);

  const queries = recursiveBanger(
    convertZAddress(zmin, smallPadding),
    convertZAddress(zmax, smallPadding),
  ).map<[string, string]>(([zStart, zEnd]) => [
    convertZAddress(zStart, bigPadding, '0'),
    convertZAddress(zEnd, bigPadding, '1'),
  ]);

  const computeTime = new Date().getTime() - startTime.getTime();

  let totalCapacityUnit = 0;
  const results = await Promise.all(
    queries.map(async query => {
      const [queryZmin, queryZmax] = query;
      const command = new QueryCommand({
        TableName:
          'captain-zorder-zorder-dynamodb-dev-ZorderDynamodbTable1D715E20-16MVPH72U00XS',
        KeyConditionExpression: 'PK = :PK AND SK BETWEEN :zmin AND :zmax',
        ExpressionAttributeValues: {
          ':PK': Buffer.from('Covid'),
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

      return Items;
    }),
  );

  const result = results.flat();

  // console.log('totalCapacityUnit', totalCapacityUnit);
  // console.log('total queries', queries.length);

  // Log the number of total items
  // console.log('total items', result.length);

  // log items outside the search box

  const itemsInsideTheBox = result.filter(({ latitude, longitude }) => {
    return (
      parseFloat(latitude) >= latMin &&
      parseFloat(latitude) <= latMax &&
      parseFloat(longitude) >= longMin &&
      parseFloat(longitude) <= longMax
    );
  });
  // console.log('items inside the search box', itemsInsideTheBox.length);

  // console.log(
  //   'items outside the box',
  //   result.length - itemsInsideTheBox.length,
  // );

  // console.log(
  //   'result set length',
  //   Array.from(new Set(itemsInsideTheBox.map(({ name }) => name))).length,
  // );

  // console.log('final time elapsed', new Date().getTime() - startTime.getTime());

  return {
    elapsedTime: new Date().getTime() - startTime.getTime(),
    totalCapacityUnit,
    computeTime,
    foundAll: itemsInsideTheBox.length === 34,
    numberOfQueries: queries.length,
    totalNumberOfItems: result.length,
    numberOfItemsInsideTheBox: itemsInsideTheBox.length,
  };
};

const scanTable = async () => {
  const command = new ScanCommand({
    TableName:
      'captain-zorder-zorder-dynamodb-dev-ZorderDynamodbTable1D715E20-16MVPH72U00XS',
    ReturnConsumedCapacity: 'TOTAL',
  });

  const {
    Items = [],
    ConsumedCapacity,
    LastEvaluatedKey,
  } = await dbDocClient.send(command);

  // console.log('Items', Items);
  console.log('ConsumedCapacity', ConsumedCapacity);

  console.log(
    Items.filter(
      ({ latitude, longitude }) =>
        parseFloat(latitude) >= 47.6 &&
        parseFloat(latitude) <= 48.59 &&
        parseFloat(longitude) >= 5.94 &&
        parseFloat(longitude) <= 7.65,
    ).length,
  );
};

// console.log(
//   Buffer.from(
//     serialize({
//       zIndex: '00111001111011111100000000000000000000',
//       date: new Date(0),
//     }),
//   ).toString('base64'),
// );

// console.log(
//   Buffer.from(
//     serialize({
//       zIndex: '00111001111011111100001111110111111101',
//       date: new Date(),
//     }),
//   ).toString('base64'),
// );

const searchBoxes = [
  [
    // all france 🥖🍷
    'all france 🥖🍷',
    [42.903057, -4.923136],
    [50.862547, 8.055211],
  ],
  // Bretagne ⛵🍺
  ['Bretagne ⛵🍺', [47.510273, -4.873205], [48.884137, -1.617018]],
  // Côte daz 5️⃣1️⃣🏖️
  ['Côte daz 5️⃣1️⃣🏖️', [43.055318, 4.504254], [43.783457, 7.531647]],
  // Côte at 🌊🏄‍♂️🍇
  ['Côte at 🌊🏄‍♂️🍇', [43.381573, -2.205868], [47.405636, -0.834208]],

  // Diag du vide 🧑‍🌾🐄🐑
  ['Diag du vide 🧑‍🌾🐄🐑', [44.517885, 0.951723], [46.617721, 3.8761]],
  // Poitiers 🍆
  ['Poitiers 🍆', [46.556284, 0.301578], [46.60182, 0.368238]],
] as const;
const decimalPlacesToCheck = [0, 1, 2, 3];
const stepsOutsides = [3, 6, 10, 30, 60, 100, 200, 500];
const resultList = [];

const bangerPerfAnalyzer = async () => {
  for (const [name, ...searchBox] of searchBoxes) {
    for (const decimalPlaces of decimalPlacesToCheck) {
      for (const stepsOutside of stepsOutsides) {
        const { floatingPointPrecision, recursiveBanger } = absoluteBanger(
          decimalPlaces,
          stepsOutside,
        );
        const result = await queryItems(
          recursiveBanger,
          floatingPointPrecision,
          searchBox,
        );

        resultList.push({ name, decimalPlaces, stepsOutside, ...result });

        console.log(name + ' done');
      }
    }
  }

  writeFileSync('./result.json', JSON.stringify(resultList, null, 2));
};

void bangerPerfAnalyzer();
