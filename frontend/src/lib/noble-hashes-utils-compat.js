export * from '../../node_modules/@noble/hashes/esm/utils.js';
export { anumber, abytes, ahash, aexists, aoutput } from '../../node_modules/@noble/hashes/esm/_assert.js';
export function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}
