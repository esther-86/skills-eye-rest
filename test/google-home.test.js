'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const yaml = fs.readFileSync(path.join(__dirname, '..', 'google-home', 'vision-protect.yaml'), 'utf8');

test('Google Home automation starts with the requested voice phrase', () => {
  assert.match(yaml, /is: start vision protect/);
});

test('Google Home delays total exactly 102 minutes', () => {
  const delays = [...yaml.matchAll(/^\s+for:\s+(\d+)(min|sec)\s*$/gm)];
  const seconds = delays.reduce((total, match) => {
    return total + Number(match[1]) * (match[2] === 'min' ? 60 : 1);
  }, 0);
  assert.equal(seconds, 102 * 60);
});

test('Google Home automation includes four breaks and final longer-break message', () => {
  assert.equal((yaml.match(/Eye break\./g) || []).length, 4);
  assert.match(yaml, /longer break/);
});
