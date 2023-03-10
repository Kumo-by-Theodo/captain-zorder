/* eslint-disable*/
export const decimalPlaces = 2;
const floatingPointPrecision = 10 ** decimalPlaces;

export const coordinatePadding = Math.ceil(
  Math.log2(360 * floatingPointPrecision),
);

const convertToBinary = (num: number) => {
  const roundedNum = Math.round((num + 180.0) * floatingPointPrecision);

  return roundedNum.toString(2).padStart(coordinatePadding, '0');
};

console.log(convertToBinary(180.01));

const interleaveBytes = (a: string, b: string) => {
  const result: string[] = [];

  for (let i = 0; i < a.length; i++) {
    result.push(a[i] ?? '');
    result.push(b[i] ?? '');
  }

  return result.join('');
};

export const buildZAddress = (lat: number, lon: number) => {
  const latBinary = convertToBinary(lat);
  const lonBinary = convertToBinary(lon);

  return interleaveBytes(latBinary, lonBinary);
};

export const parseZAddressToLatLong = (zAddress: string): [number, number] => {
  const latBinary = zAddress
    .split('')
    .filter((_, i) => i % 2 === 0)
    .join('');
  const lonBinary = zAddress
    .split('')
    .filter((_, i) => i % 2 === 1)
    .join('');

  const lat = parseInt(latBinary, 2) / floatingPointPrecision - 180.0;
  const lon = parseInt(lonBinary, 2) / floatingPointPrecision - 180.0;

  return [lat, lon];
};

const isRelevant = (
  minZAddress: string,
  maxZAddress: string,
  zAddress: string,
) => {
  const [minLat, minLon] = parseZAddressToLatLong(minZAddress);
  const [maxLat, maxLon] = parseZAddressToLatLong(maxZAddress);
  const [lat, lon] = parseZAddressToLatLong(zAddress);

  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
};

const zDivide = (minZAddress: string, maxZAddress: string) => {
  const mostSignificantBit = getMostSignificantBit(minZAddress, maxZAddress);

  switch (mostSignificantBit % 2) {
    case 0:
      return zDivideHorizontal(minZAddress, maxZAddress, mostSignificantBit);
    case 1:
      return zDivideVertical(minZAddress, maxZAddress, mostSignificantBit);
    default:
      throw new Error('Something went wrong');
  }
};

const getMostSignificantBit = (minZAddress: string, maxZAddress: string) => {
  for (
    let mostSignificantBit = 0;
    mostSignificantBit < minZAddress.length;
    mostSignificantBit++
  ) {
    if (minZAddress[mostSignificantBit] !== maxZAddress[mostSignificantBit]) {
      return mostSignificantBit;
    }
  }

  return -1;
};

const zDivideHorizontal = (
  minZAddress: string,
  maxZAddress: string,
  mostSignificantBit: number,
): [string, string] => {
  const [, minLon] = parseZAddressToLatLong(minZAddress);
  const [, maxLon] = parseZAddressToLatLong(maxZAddress);
  const litMaxLon = maxLon;
  const bigMinLon = minLon;

  const latBinaryStart = minZAddress
    .split('')
    .slice(0, mostSignificantBit)
    .filter((_, i) => i % 2 === 0)
    .join('');

  const litMaxLatBinary = latBinaryStart
    .concat('0')
    .padEnd(coordinatePadding, '1');
  const bigMinLatBinary = latBinaryStart
    .concat('1')
    .padEnd(coordinatePadding, '0');

  const litMax = interleaveBytes(litMaxLatBinary, convertToBinary(litMaxLon));
  const bigMin = interleaveBytes(bigMinLatBinary, convertToBinary(bigMinLon));

  return [litMax, bigMin];
};

const zDivideVertical = (
  minZAddress: string,
  maxZAddress: string,
  mostSignificantBit: number,
): [string, string] => {
  const [minLat] = parseZAddressToLatLong(minZAddress);
  const [maxLat] = parseZAddressToLatLong(maxZAddress);
  const litMaxLat = maxLat;
  const bigMinLat = minLat;

  const lonBinaryStart = minZAddress
    .split('')
    .slice(0, mostSignificantBit)
    .filter((_, i) => i % 2 === 1)
    .join('');

  const litMaxLonBinary = lonBinaryStart
    .concat('0')
    .padEnd(coordinatePadding, '1');
  const bigMinLonBinary = lonBinaryStart
    .concat('1')
    .padEnd(coordinatePadding, '0');

  const litMax = interleaveBytes(convertToBinary(litMaxLat), litMaxLonBinary);
  const bigMin = interleaveBytes(convertToBinary(bigMinLat), bigMinLonBinary);

  return [litMax, bigMin];
};

const incrementZAddress = (zAddress: string) => {
  const binaryZAddressString = '0b' + zAddress;

  const bigBinary = BigInt(binaryZAddressString);
  const biggerBinary = bigBinary + BigInt(1);

  return biggerBinary.toString(2).padStart(2 * coordinatePadding, '0');
};

export const recursiveBanger = (
  zMin: string,
  zMax: string,
  recursionCount = 0,
  zCurrent = zMin,
  missCount = 0,
): [string, string][] => {
  if (zCurrent >= zMax) {
    return [[zMin, zMax]];
  }

  // if (nextMissCount < 3) {
  //   return recursiveBanger(zMin, zMax, nextZAddress, nextMissCount);
  // }

  let nextMissCount = missCount;
  let nextZAddress = zCurrent;
  while (nextMissCount < 300) {
    nextMissCount = isRelevant(zMin, zMax, nextZAddress)
      ? 0
      : nextMissCount + 1;
    nextZAddress = incrementZAddress(nextZAddress);

    if (nextZAddress === zMax) {
      return [[zMin, zMax]];
    }
  }

  const [litMax, bigMin] = zDivide(zMin, zMax);

  // if (litMax < zCurrent) {
  //   return [[zMin, litMax] as [string, string]].concat(
  //     recursiveBanger(bigMin, zMax),
  //   );
  // }

  return recursiveBanger(
    zMin,
    litMax,
    recursionCount + 1,
    zCurrent,
    missCount,
  ).concat(recursiveBanger(bigMin, zMax, recursionCount + 1));
};
