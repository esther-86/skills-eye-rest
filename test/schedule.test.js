'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SCHEDULE, SESSION_MINUTES } = require('../alexa/lambda/schedule');

test('schedule uses exact offsets from skill start', () => {
  assert.deepEqual(
    SCHEDULE.map(item => item.offsetSeconds),
    [1200, 1230, 2430, 2460, 3660, 3690, 4890, 4920, 5400]
  );
});

test('every break lasts exactly 30 seconds', () => {
  const breakIndexes = SCHEDULE.flatMap((item, index) => item.kind === 'break' ? [index] : []);
  for (const index of breakIndexes) {
    assert.equal(SCHEDULE[index + 1].kind, 'resume');
    assert.equal(SCHEDULE[index + 1].offsetSeconds - SCHEDULE[index].offsetSeconds, 30);
  }
});

test('session ends at 90 minutes with a longer-break suggestion', () => {
  const last = SCHEDULE.at(-1);
  assert.equal(last.offsetSeconds, SESSION_MINUTES * 60);
  assert.equal(last.kind, 'complete');
  assert.match(last.text, /longer break/i);
});
