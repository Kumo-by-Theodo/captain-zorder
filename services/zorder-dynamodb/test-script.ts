import { buildZAddress, recursiveBanger } from 'absoluteBanger';

const minLat = '48.82';
const minLon = '2.25';

const maxLat = '48.90';
const maxLon = '2.42';

console.log(
  buildZAddress(parseFloat(minLat), parseFloat(minLon)),
  buildZAddress(parseFloat(maxLat), parseFloat(maxLon)),
);

const result = recursiveBanger(
  buildZAddress(parseFloat(minLat), parseFloat(minLon)),
  buildZAddress(parseFloat(maxLat), parseFloat(maxLon)),
);

result.map(([min, max]) => {
  console.log(BigInt('0b' + min).toString(10), BigInt('0b' + max).toString(10));
});
console.log(result.length);
