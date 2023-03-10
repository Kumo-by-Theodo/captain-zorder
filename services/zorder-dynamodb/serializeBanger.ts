import { coordinatePadding } from 'absoluteBanger';

const TIMESTAMP_SIZE = 36;
const timestampHexSize = Math.ceil(TIMESTAMP_SIZE / 4);
const zIndexHexSize = Math.ceil(coordinatePadding / 2);

export const deserialize = (
  bin: Uint8Array,
): {
  zIndex: string;
  date: Date;
} => {
  const buf = Buffer.from(bin);

  const zIndex = parseInt(buf.toString('hex').slice(0, -timestampHexSize), 16)
    .toString(2)
    .padStart(2 * coordinatePadding, '0');

  const date = new Date(
    parseInt(buf.toString('hex').slice(-timestampHexSize), 16) * 1000,
  );

  return { zIndex, date };
};

export const serialize = ({
  zIndex,
  date,
}: {
  zIndex: string;
  date: Date;
}): Uint8Array => {
  const payload = parseInt(zIndex, 2)
    .toString(16)
    .padStart(zIndexHexSize, '0')
    .concat(
      Math.floor(date.getTime() / 1000)
        .toString(16)
        .padStart(timestampHexSize, '0'),
    );

  const buf = Buffer.from(
    payload.length % 2 === 0 ? payload : '0'.concat(payload),
    'hex',
  );

  return buf;
};

/*
const testDate = new Date('2023-03-18T19:32:16.000Z');
const testZIndex = buildZAddress(48.83, 2.25);


console.log('serialized :', serialize({ zIndex: testZIndex, date: testDate }));
console.log(
  'buffer size in bits :',
  serialize({ zIndex: testZIndex, date: testDate }).byteLength * 8,
);
console.log('zIndex :', testZIndex);
console.log('date :', testDate);
console.log(
  'deserialized :',
  deserialize(serialize({ zIndex: testZIndex, date: testDate })),
);
*/
