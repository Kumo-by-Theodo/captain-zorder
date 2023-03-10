import { buildZAddress } from 'absoluteBanger';
import { deserialize, serialize } from 'serializeBanger';

describe('serialize', () => {
  it.each([
    [0, 0, new Date()],
    [-180, -180, new Date('1990-03-18T19:32:16.000Z')],
    [0, 180, new Date('2023-03-18T19:32:16.123Z')],
    [0, -180, new Date('2000-03-18T19:32:00.000Z')],
    [180, 0, new Date('2100-03-18T19:00:00.000Z')],
    [-180, 0, new Date('2050-03-18T00:00:00.000Z')],
    [180, 180, new Date('1970-03-01T00:00:00.000Z')],
  ])(
    'should build 10 byte sized buffer for { lat: %i, long: %i }',
    (lat, lon, date) => {
      const serialized = serialize({
        zIndex: buildZAddress(lat, lon),
        date,
      });

      expect(serialized.byteLength).toEqual(10);
    },
  );
});
describe('deserialize', () => {
  it.each([
    [0, 0, new Date()],
    [-180, -180, new Date('1990-03-18T19:32:16.000Z')],
    [0, 180, new Date('2023-03-18T19:32:16.123Z')],
    [0, -180, new Date('2000-03-18T19:32:00.000Z')],
    [180, 0, new Date('2100-03-18T19:00:00.000Z')],
    [-180, 0, new Date('2050-03-18T00:00:00.000Z')],
    [180, 180, new Date('1970-03-01T00:00:00.000Z')],
  ])('should get back the serialized data', (lat, lon, date) => {
    const zIndex = buildZAddress(lat, lon);
    const result = deserialize(
      serialize({
        date,
        zIndex,
      }),
    );

    date.setUTCMilliseconds(0);

    expect(result.date).toEqual(date);
    expect(result.zIndex).toEqual(zIndex);
  });
});
