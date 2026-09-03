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
  const result = await route(event('IntentRequest', 'StartVisionPauseIntent'), {
    createSchedule: async value => { input = value; },
    cancelSchedule: async () => { canceled = true; return 0; }
  });
  assert.equal(canceled, true);
  assert.equal(input.schedule.length, 9);
  assert.equal(input.schedule[0].offsetSeconds, 1200);
  assert.equal(input.schedule.at(-1).offsetSeconds, 6120);
  assert.equal(result.response.outputSpeech.text, 'Vision Pause started for 5 20-minute focus periods. Your first eye break is in 20 minutes.');
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
  assert.match(result.response.outputSpeech.text, /3 20-minute focus periods/i);
});

test('period counts outside one to five are rejected conversationally', async () => {
  const result = await route(event('IntentRequest', 'NumberOfPeriodsIntent', true, {
    focusPeriods: { name: 'focusPeriods', value: '6' }
  }));
  assert.equal(result.response.shouldEndSession, false);
  assert.match(result.response.outputSpeech.text, /between one and five/i);
});

test('what do you do gives the detailed help message', async () => {
  const result = await route(event('IntentRequest', 'AboutVisionPauseIntent'));
  assert.equal(result.response.shouldEndSession, false);
  assert.match(result.response.outputSpeech.text, /one to five 20-minute focus periods/i);
  assert.match(result.response.outputSpeech.text, /five periods is the default/i);
});

test('missing permission returns Alexa permissions card', async () => {
  const result = await route(event('IntentRequest', 'StartVisionPauseIntent', false));
  assert.equal(result.response.card.type, 'AskForPermissionsConsent');
  assert.deepEqual(result.response.card.permissions, [REMINDERS_PERMISSION]);
});

test('cancel reports canceled schedule', async () => {
  const result = await route(event('IntentRequest', 'CancelVisionPauseIntent'), {
    createSchedule: async () => {},
    cancelSchedule: async () => 9
  });
  assert.match(result.response.outputSpeech.text, /canceled/i);
});
