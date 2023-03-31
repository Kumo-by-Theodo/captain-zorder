import {
  convertToBinary,
  getPaddingFromPrecision,
  interleaveBytes,
  parseZAddressToLatLong,
} from 'utilsBanger';

/* eslint-disable*/

export const absoluteBanger = (decimalPlaces: number, stepsOutside: number) => {
  const floatingPointPrecision = 10 ** decimalPlaces;
  const coordinatePadding = getPaddingFromPrecision(floatingPointPrecision);
  const isRelevant = (
    minZAddress: string,
    maxZAddress: string,
    zAddress: string,
  ) => {
    const [minLat, minLon] = parseZAddressToLatLong(
      minZAddress,
      floatingPointPrecision,
    );
    const [maxLat, maxLon] = parseZAddressToLatLong(
      maxZAddress,
      floatingPointPrecision,
    );
    const [lat, lon] = parseZAddressToLatLong(zAddress, floatingPointPrecision);

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
    const [, minLon] = parseZAddressToLatLong(
      minZAddress,
      floatingPointPrecision,
    );
    const [, maxLon] = parseZAddressToLatLong(
      maxZAddress,
      floatingPointPrecision,
    );
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

    const litMax = interleaveBytes(
      litMaxLatBinary,
      convertToBinary(litMaxLon, floatingPointPrecision),
    );
    const bigMin = interleaveBytes(
      bigMinLatBinary,
      convertToBinary(bigMinLon, floatingPointPrecision),
    );

    return [litMax, bigMin];
  };

  const zDivideVertical = (
    minZAddress: string,
    maxZAddress: string,
    mostSignificantBit: number,
  ): [string, string] => {
    const [minLat] = parseZAddressToLatLong(
      minZAddress,
      floatingPointPrecision,
    );
    const [maxLat] = parseZAddressToLatLong(
      maxZAddress,
      floatingPointPrecision,
    );
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

    const litMax = interleaveBytes(
      convertToBinary(litMaxLat, floatingPointPrecision),
      litMaxLonBinary,
    );
    const bigMin = interleaveBytes(
      convertToBinary(bigMinLat, floatingPointPrecision),
      bigMinLonBinary,
    );

    return [litMax, bigMin];
  };

  const incrementZAddress = (zAddress: string) => {
    const binaryZAddressString = '0b' + zAddress;

    const bigBinary = BigInt(binaryZAddressString);
    const biggerBinary = bigBinary + BigInt(1);

    return biggerBinary.toString(2).padStart(2 * coordinatePadding, '0');
  };

  const recursiveBanger = (
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
    while (nextMissCount < stepsOutside) {
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

  return { floatingPointPrecision, recursiveBanger };
};
