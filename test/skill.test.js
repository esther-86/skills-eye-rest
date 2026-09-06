'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { route, REMINDERS_PERMISSION } = require('../alexa/lambda/index');

function event(type, intent, permitted = true, slots) {
  return {
    request: { type, intent: intent ? { name: intent, slots } : undefined },
    context: {
      System: {
        apiEndpoint: 'https://api.amazonalexa.com',
        apiAccessToken: 'api-token',
        user: permitted ? { permissions: { consentToken: 'consent' } } : {}
      }
    }
  };
}

test('launch asks before starting', async () => {
  const result = await route(event('LaunchRequest'));
  assert.equal(result.response.shouldEndSession, false);
  assert.equal(result.response.outputSpeech.text, 'Start five 20-minute focus periods?');
});

test('start creates the default five-period relative schedule', async () => {
  let input;
  let canceled = false;
  const result = await route(event('IntentRequest', 'StartVisionProtectIntent'), {
    createSchedule: async value => { input = value; },
    cancelSchedule: async () => { canceled = true; return 0; }
  });
  assert.equal(canceled, true);
  assert.equal(input.schedule.length, 9);
  assert.equal(input.schedule[0].offsetSeconds, 1200);
  assert.equal(input.schedule.at(-1).offsetSeconds, 6120);
  assert.equal(result.response.outputSpeech.text, 'Your first eye break is in 20 minutes.');
});

test('no asks how many periods from one to five', async () => {
  const result = await route(event('IntentRequest', 'AMAZON.NoIntent'));
  assert.equal(result.response.shouldEndSession, false);
  assert.match(result.response.outputSpeech.text, /from one to five/i);
});

test('chosen period count creates a matching schedule', async () => {
  let input;
  const result = await route(event('IntentRequest', 'NumberOfPeriodsIntent', true, {
    focusPeriods: { name: 'focusPeriods', value: '3' }
  }), {
    createSchedule: async value => { input = value; },
    cancelSchedule: async () => 0
  });
  assert.equal(input.schedule.length, 5);
  assert.equal(input.schedule.at(-1).offsetSeconds, 3660);
  assert.equal(result.response.outputSpeech.text, 'Your first eye break is in 20 minutes.');
});

test('period counts outside one to five are rejected conversationally', async () => {
  const result = await route(event('IntentRequest', 'NumberOfPeriodsIntent', true, {
    focusPeriods: { name: 'focusPeriods', value: '6' }
  }));
  assert.equal(result.response.shouldEndSession, false);
  assert.match(result.response.outputSpeech.text, /between one and five/i);
});

test('what do you do gives the detailed help message', async () => {
  const result = await route(event('IntentRequest', 'AboutVisionProtectIntent'));
  assert.equal(result.response.shouldEndSession, false);
  assert.match(result.response.outputSpeech.text, /one to five 20-minute focus periods/i);
  assert.match(result.response.outputSpeech.text, /five periods is the default/i);
});

test('missing API token returns spoken guidance without calling reminders', async () => {
  const request = event('IntentRequest', 'StartVisionProtectIntent', false);
  delete request.context.System.apiAccessToken;
  const result = await route(request, {});
  assert.match(result.response.outputSpeech.text, /Save Permissions/);
  assert.equal(result.response.card.type, 'AskForPermissionsConsent');
  assert.deepEqual(result.response.card.permissions, [REMINDERS_PERMISSION]);
});

test('API permission denials return guidance for start, yes, and cancel', async () => {
  for (const intent of ['StartVisionProtectIntent', 'AMAZON.YesIntent', 'CancelVisionProtectIntent']) {
    for (const statusCode of [401, 403]) {
      const result = await route(event('IntentRequest', intent, false), {
        cancelSchedule: async () => { throw Object.assign(new Error('Access denied'), { statusCode }); },
        createSchedule: async () => assert.fail('must not create after permission denial')
      });
      assert.match(result.response.outputSpeech.text, /cannot access your reminders/);
      assert.match(result.response.outputSpeech.text, /Save Permissions/);
      assert.equal(result.response.card.type, 'AskForPermissionsConsent');
      assert.equal(result.response.shouldEndSession, true);
    }
  }
});

test('authorized API access works without deprecated consentToken', async () => {
  let created = false;
  const result = await route(event('IntentRequest', 'StartVisionProtectIntent', false), {
    cancelSchedule: async () => 0,
    createSchedule: async () => { created = true; }
  });
  assert.equal(created, true);
  assert.equal(result.response.outputSpeech.text, 'Your first eye break is in 20 minutes.');
});

test('permission revoked during creation returns permission guidance', async () => {
  const result = await route(event('IntentRequest', 'StartVisionProtectIntent'), {
    cancelSchedule: async () => 0,
    createSchedule: async () => { throw Object.assign(new Error('Access denied'), { statusCode: 403 }); }
  });
  assert.match(result.response.outputSpeech.text, /cannot access your reminders/);
  assert.equal(result.response.card.type, 'AskForPermissionsConsent');
});

test('cancel reports canceled schedule', async () => {
  const result = await route(event('IntentRequest', 'CancelVisionProtectIntent'), {
    createSchedule: async () => {},
    cancelSchedule: async () => 9
  });
  assert.match(result.response.outputSpeech.text, /canceled/i);
});


test('starting again after all previous reminders completed creates a fresh session', async () => {
  const reminders = require('../alexa/lambda/reminders');
  const calls = [];
  const request = async options => {
    calls.push(options);
    if (options.method === 'GET') return { alerts: [
      { alertToken: 'old-break', status: 'COMPLETED' },
      { alertToken: 'old-complete', status: 'COMPLETED' }
    ] };
    assert.equal(options.method, 'POST', 'completed reminders must not be deleted');
    return { alertToken: `new-${calls.length}` };
  };
  const result = await route(event('IntentRequest', 'StartVisionProtectIntent'), {
    cancelSchedule: options => reminders.cancelSchedule({ ...options, request }),
    createSchedule: options => reminders.createSchedule({ ...options, request })
  });
  assert.equal(result.response.outputSpeech.text, 'Your first eye break is in 20 minutes.');
  assert.equal(result.response.shouldEndSession, true);
  assert.equal(calls.filter(call => call.method === 'POST').length, 9);
});
