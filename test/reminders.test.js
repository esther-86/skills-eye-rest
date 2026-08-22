'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSchedule, reminderPayload } = require('../alexa/lambda/reminders');

test('reminder payload is relative to the moment the schedule is created', () => {
  const now = new Date('2026-08-22T20:00:00.000Z');
  const body = reminderPayload({ offsetSeconds: 1200, text: 'Take a break.' }, now);
  assert.equal(body.requestTime, now.toISOString());
  assert.deepEqual(body.trigger, { type: 'SCHEDULED_RELATIVE', offsetInSeconds: 1200 });
  assert.equal(body.alertInfo.spokenInfo.content[0].text, 'Take a break.');
});

test('createSchedule creates every reminder', async () => {
  const calls = [];
  const request = async options => {
    calls.push(options);
    return { alertToken: `token-${calls.length}` };
  };
  const tokens = await createSchedule({
    apiEndpoint: 'https://api.amazonalexa.com',
    apiAccessToken: 'access-token',
    schedule: [
      { offsetSeconds: 1200, text: 'Break', kind: 'break' },
      { offsetSeconds: 1230, text: 'Resume', kind: 'resume' }
    ],
    requestTime: new Date('2026-08-22T20:00:00.000Z'),
    request
  });
  assert.deepEqual(tokens, ['token-1', 'token-2']);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.trigger.offsetInSeconds, 1200);
});

test('createSchedule removes earlier reminders after a partial failure', async () => {
  const calls = [];
  let posts = 0;
  const request = async options => {
    calls.push(options);
    if (options.method === 'POST') {
      posts += 1;
      if (posts === 2) throw new Error('network failure');
      return { alertToken: 'first-token' };
    }
    return {};
  };
  await assert.rejects(createSchedule({
    apiEndpoint: 'https://api.amazonalexa.com',
    apiAccessToken: 'access-token',
    schedule: [
      { offsetSeconds: 1200, text: 'Break' },
      { offsetSeconds: 1230, text: 'Resume' }
    ],
    request
  }));
  assert.equal(calls.at(-1).method, 'DELETE');
  assert.match(calls.at(-1).url, /first-token$/);
});
