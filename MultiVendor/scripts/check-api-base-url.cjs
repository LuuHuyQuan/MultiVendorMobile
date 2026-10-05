const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../src/api/baseUrl.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const sourceModule = new Module(sourcePath);
sourceModule._compile(compiled.outputText, sourcePath);
const { getExpoApiBaseUrl, resolveApiBaseUrl } = sourceModule.exports;

for (const [host, expected] of [
  ['192.168.1.79:8081', 'http://192.168.1.79:8081/api'],
  ['192.168.5.12:8081', 'http://192.168.5.12:8081/api'],
  ['10.1.2.3:8081', 'http://10.1.2.3:8081/api'],
  ['172.20.1.2:8081', 'http://172.20.1.2:8081/api'],
  ['localhost:8081', 'http://localhost:8081/api'],
  ['[::1]:8081', 'http://[::1]:8081/api'],
  ['exp://192.168.1.79:8081', 'http://192.168.1.79:8081/api'],
  ['test.trycloudflare.com:443', 'https://test.trycloudflare.com:443/api'],
  ['test.exp.direct', 'https://test.exp.direct/api'],
  ['exp://test.trycloudflare.com:443', 'https://test.trycloudflare.com:443/api'],
  ['exps://test.trycloudflare.com', 'https://test.trycloudflare.com/api'],
  ['https://test.trycloudflare.com', 'https://test.trycloudflare.com/api'],
  ['http://test.example:8081', 'http://test.example:8081/api'],
  ['', undefined],
  [null, undefined],
  ['https://user:secret@test.example', undefined],
  ['https://test.example/api', undefined],
  ['https://test.example?token=test', undefined],
  ['file:///example', undefined],
]) {
  assert.equal(getExpoApiBaseUrl(host), expected, `Expo host: ${host}`);
}

assert.equal(resolveApiBaseUrl({ platform: 'android', developmentHost: '192.168.1.79:8081' }),
  'http://192.168.1.79:8081/api');
assert.equal(resolveApiBaseUrl({ platform: 'ios', developmentHost: 'test.trycloudflare.com:443' }),
  'https://test.trycloudflare.com:443/api');
assert.equal(resolveApiBaseUrl({ platform: 'android', apiBaseUrl: ' https://api.example/api/ ', developmentHost: '192.168.1.79:8081' }),
  'https://api.example/api');
assert.equal(resolveApiBaseUrl({ platform: 'web', webApiBaseUrl: '/api', developmentHost: 'test.trycloudflare.com:443' }), '/api');
assert.equal(resolveApiBaseUrl({ platform: 'web', developmentHost: 'test.trycloudflare.com:443' }), '/api');
assert.equal(resolveApiBaseUrl({ platform: 'android' }), 'http://10.0.2.2:5027/api');
console.log('API address checks passed (LAN, HTTPS tunnel, explicit production URL, web proxy).');
