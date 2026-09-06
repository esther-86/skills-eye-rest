'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cancelSchedule, createSchedule, reminderPayload } = require('../alexa/lambda/reminders');

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
  assert.equal(calls[0].body.alertInfo.spokenInfo.content[0].text, 'Break');
});

test('cancelSchedule removes every reminder returned for the skill', async () => {
  const calls = [];
  const request = async options => {
    calls.push(options);
    if (options.method === 'GET') {
      return { alerts: [{ alertToken: 'first' }, { alertToken: 'second' }] };
    }
    return {};
  };
  const count = await cancelSchedule({
    apiEndpoint: 'https://api.amazonalexa.com',
    apiAccessToken: 'access-token',
    request
  });
  assert.equal(count, 2);
  assert.deepEqual(calls.slice(1).map(call => call.method), ['DELETE', 'DELETE']);
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


test('cancel skips completed history and deletes only active reminders', async () => {
  const calls = [];
  const count = await cancelSchedule({
    apiEndpoint: 'https://api.amazonalexa.com', apiAccessToken: 'test-token',
    request: async options => {
      calls.push(options);
      if (options.method === 'GET') return { alerts: [
        { alertToken: 'done', status: 'COMPLETED' },
        { alertToken: 'active', status: 'ON' }
      ] };
      assert.match(options.url, /\/active$/);
      return {};
    }
  });
  assert.equal(count, 1);
  assert.equal(calls.length, 2);
});

test('cancel tolerates a reminder disappearing after listing', async () => {
  const count = await cancelSchedule({
    apiEndpoint: 'https://api.amazonalexa.com', apiAccessToken: 'test-token',
    request: async options => {
      if (options.method === 'GET') return { alerts: [{ alertToken: 'gone', status: 'ON' }] };
      throw Object.assign(new Error('not found'), { statusCode: 404 });
    }
  });
  assert.equal(count, 0);
});

test('cancel does not hide permission, rate limit, or service failures', async () => {
  for (const statusCode of [400, 401, 403, 429, 500, 503]) {
    await assert.rejects(cancelSchedule({
      apiEndpoint: 'https://api.amazonalexa.com', apiAccessToken: 'test-token',
      request: async options => {
        if (options.method === 'GET') return { alerts: [{ alertToken: 'active', status: 'ON' }] };
        throw Object.assign(new Error('request failed'), { statusCode });
      }
    }), error => error.statusCode === statusCode);
  }
});
