export const getPaddingFromPrecision = (
  floatingPointPrecision: number,
): number => {
  return Math.ceil(Math.log2(360 * floatingPointPrecision));
};

export const convertToBinary = (
  num: number,
  floatingPointPrecision: number,
): string => {
  const roundedNum = Math.round((num + 180.0) * floatingPointPrecision);

  const coordinatePadding = getPaddingFromPrecision(floatingPointPrecision);

  return roundedNum.toString(2).padStart(coordinatePadding, '0');
};

export const interleaveBytes = (a: string, b: string): string => {
  const result: string[] = [];

  for (let i = 0; i < a.length; i++) {
    result.push(a[i] ?? '');
    result.push(b[i] ?? '');
  }

  return result.join('');
};

export const buildZAddress = (
  lat: number,
  lon: number,
  floatingPointPrecision: number,
): string => {
  const latBinary = convertToBinary(lat, floatingPointPrecision);
  const lonBinary = convertToBinary(lon, floatingPointPrecision);

  return interleaveBytes(latBinary, lonBinary);
};
export const parseZAddressToLatLong = (
  zAddress: string,
  floatingPointPrecision: number,
): [number, number] => {
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

export const convertZAddress = (
  zAddress: string,
  toPadding: number,
  padWith: '0' | '1' = '0',
): string => {
  const zAddressLength = zAddress.length;

  if (zAddressLength > 2 * toPadding) {
    return zAddress.slice(0, 2 * toPadding);
  }

  return zAddress.padEnd(2 * toPadding, padWith);
};
