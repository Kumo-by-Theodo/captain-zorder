import { buildZAddress, parseZAddressToLatLong } from 'absoluteBanger';

describe('buildZAddress', () => {
  it.each([
    [0, 0, '00110011001111111111110000110000000000'],
    [-180, -180, '00000000000000000000000000000000000000'],
    [0, 180, '01100110011111111111100001100000000000'],
    [0, -180, '00100010001010101010100000100000000000'],
    [180, 0, '10011001101111111111010010010000000000'],
    [-180, 0, '00010001000101010101010000010000000000'],
    [180, 180, '11001100111111111111000011000000000000'],
  ])(
    'should build zAddress for { lat: %i, long: %i }',
    (lat, lon, expected) => {
      const zIndex = buildZAddress(lat, lon);

      expect(zIndex).toEqual(expected);
    },
  );
});
describe('parseZAddressToLatLong', () => {
  it.each([
    [0, 0],
    [-180, -180],
    [0, 180],
    [0, -180],
    [180, 0],
    [-180, 0],
    [180, 180],
  ])('should return initial values for { lat: %i, long: %i }', (lat, lon) => {
    const zIndex = buildZAddress(lat, lon);
    const result = parseZAddressToLatLong(zIndex);

    expect(result).toEqual([lat, lon]);
  });
});
