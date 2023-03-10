const latA = 10.0123;
const lonA = 20.4567;

const latB = 30.6789;
const lonB = 40.8976;

const convertToBinary = (num: number) => {
  const roundedNum = Math.round((num + 180.0) * 10000.0);

  return roundedNum.toString(2).padStart(11, '0');
};

const interleaveBytes = (a: string, b: string) => {
  const result = [];

  for (let i = 0; i < a.length; i++) {
    result.push(a[i]);
    result.push(b[i]);
  }

  return result.join('');
};

const buildZAddress = (lat: number, lon: number) => {
  const latBinary = convertToBinary(lat);
  const lonBinary = convertToBinary(lon);

  return interleaveBytes(latBinary, lonBinary);
};

const parseZAddressToLatLong = (zAddress: string): [number, number] => {
  const latBinary = zAddress
    .split('')
    .filter((_, i) => i % 2 === 0)
    .join('');
  const lonBinary = zAddress
    .split('')
    .filter((_, i) => i % 2 === 1)
    .join('');

  const lat = parseInt(latBinary, 2) / 10000.0 - 180.0;
  const lon = parseInt(lonBinary, 2) / 10000.0 - 180.0;

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

console.log(
  'result',
  isRelevant(
    buildZAddress(latA, lonA),
    buildZAddress(latB, lonB),
    buildZAddress(15.6789, 30.9876),
  ),
);

const zDivide = (minZaddress: string, maxZAddress: string) => {
  const mostSignificantBit = getMostSignificantBit(minZaddress, maxZAddress);

  switch (mostSignificantBit % 2) {
    case 0:
      return zDivideHorizontal(minZaddress, maxZAddress, mostSignificantBit);
    case 1:
      return zDivideVertical(minZaddress, maxZAddress, mostSignificantBit);
    default:
      throw new Error('Something went wrong');
  }
};

const getMostSignificantBit = (minZaddress: string, maxZAddress: string) => {
  for (
    let mostSignificantBit = 0;
    mostSignificantBit < minZaddress.length;
    mostSignificantBit++
  ) {
    if (minZaddress[mostSignificantBit] !== maxZAddress[mostSignificantBit]) {
      return mostSignificantBit;
    }
  }

  return -1;
};

const zDivideHorizontal = (
  minZaddress: string,
  maxZAddress: string,
  mostSignificantBit: number,
): [string, string] => {
  const [, minLon] = parseZAddressToLatLong(minZaddress);
  const [, maxLon] = parseZAddressToLatLong(maxZAddress);
  const litMaxLon = maxLon;
  const bigMinLon = minLon;

  const latBinaryStart = minZaddress
    .split('')
    .slice(0, mostSignificantBit)
    .filter((_, i) => i % 2 === 0)
    .join('');

  const litMaxLatBinary = latBinaryStart.concat('0').padEnd(11, '1');
  const bigMinLatBinary = latBinaryStart.concat('1').padEnd(11, '0');

  const litMax = interleaveBytes(litMaxLatBinary, convertToBinary(litMaxLon));
  const bigMin = interleaveBytes(bigMinLatBinary, convertToBinary(bigMinLon));

  return [litMax, bigMin];
};

const zDivideVertical = (
  minZaddress: string,
  maxZAddress: string,
  mostSignificantBit: number,
): [string, string] => {
  const [minLat] = parseZAddressToLatLong(minZaddress);
  const [maxLat] = parseZAddressToLatLong(maxZAddress);
  const litMaxLat = maxLat;
  const bigMinLat = minLat;

  const lonBinaryStart = minZaddress
    .split('')
    .slice(0, mostSignificantBit)
    .filter((_, i) => i % 2 === 1)
    .join('');

  const litMaxLonBinary = lonBinaryStart.concat('0').padEnd(11, '1');
  const bigMinLonBinary = lonBinaryStart.concat('1').padEnd(11, '0');

  const litMax = interleaveBytes(convertToBinary(litMaxLat), litMaxLonBinary);
  const bigMin = interleaveBytes(convertToBinary(bigMinLat), bigMinLonBinary);

  return [litMax, bigMin];
};

// console.log(
//   zDivide('01100010'.padStart(22, '0'), '01101011'.padStart(22, '0')),
// );

const incrementZAddress = (zAddress: string) => {
  const binary = parseInt(zAddress, 2);
  const incrementedBinary = binary + 1;

  return incrementedBinary.toString(2).padStart(22, '0');
};

const recursiveBanger = (
  zmin: string,
  zmax: string,
  zcurrent = zmin,
  missCount = 0,
): [string, string][] => {
  if (zcurrent >= zmax) {
    return [[zmin, zmax]];
  }

  const nextMissCount = isRelevant(zmin, zmax, zcurrent) ? 0 : missCount + 1;

  const nextZAddress = incrementZAddress(zcurrent);

  if (nextMissCount < 3) {
    return recursiveBanger(zmin, zmax, nextZAddress, nextMissCount);
  }

  const [litMax, bigMin] = zDivide(zmin, zmax);

  // if (litMax < zcurrent) {
  //   return [[zmin, litMax] as [string, string]].concat(
  //     recursiveBanger(bigMin, zmax),
  //   );
  // }

  return recursiveBanger(zmin, litMax, zcurrent, missCount).concat(
    recursiveBanger(bigMin, zmax),
  );
};

console.log(
  recursiveBanger('00110011'.padStart(22, '0'), '11000001'.padStart(22, '0')),
);
