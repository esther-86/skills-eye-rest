'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SCHEDULE, buildSchedule, sessionSeconds } = require('../alexa/lambda/schedule');

test('default schedule uses five complete 20-minute focus periods', () => {
  assert.deepEqual(
    SCHEDULE.map(item => item.offsetSeconds),
    [1200, 1230, 2430, 2460, 3660, 3690, 4890, 4920, 6120]
  );
  assert.equal(SCHEDULE.at(-1).offsetSeconds, 102 * 60);
});

test('every break lasts exactly 30 seconds', () => {
  const breakIndexes = SCHEDULE.flatMap((item, index) => item.kind === 'break' ? [index] : []);
  for (const index of breakIndexes) {
    assert.equal(SCHEDULE[index + 1].kind, 'resume');
    assert.equal(SCHEDULE[index + 1].offsetSeconds - SCHEDULE[index].offsetSeconds, 30);
  }
});

test('one to five periods produce the expected durations and reminder counts', () => {
  for (let periods = 1; periods <= 5; periods += 1) {
    const schedule = buildSchedule(periods);
    assert.equal(schedule.length, 2 * (periods - 1) + 1);
    assert.equal(schedule.at(-1).offsetSeconds, sessionSeconds(periods));
    assert.equal(schedule.at(-1).kind, 'complete');
    assert.match(schedule.at(-1).text, /longer break/i);
  }
});

test('period counts outside one to five are rejected', () => {
  assert.throws(() => buildSchedule(0), RangeError);
  assert.throws(() => buildSchedule(6), RangeError);
});
