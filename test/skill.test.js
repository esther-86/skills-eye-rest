'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { route, REMINDERS_PERMISSION } = require('../alexa/lambda/index');

function event(type, intent, permitted = true) {
  return {
    request: { type, intent: intent ? { name: intent } : undefined },
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
  assert.equal(result.response.outputSpeech.text, 'Start a 90 minute eye break session?');
});

test('start creates relative schedule and confirms 90 minutes', async () => {
  let input;
  let canceled = false;
  const result = await route(event('IntentRequest', 'StartEyeRestIntent'), {
    createSchedule: async value => { input = value; },
    cancelSchedule: async () => { canceled = true; return 0; }
  });
  assert.equal(canceled, true);
  assert.equal(input.schedule.length, 9);
  assert.equal(input.schedule[0].offsetSeconds, 1200);
  assert.equal(result.response.outputSpeech.text, 'Eye Rest started. Your first break is in 20 minutes.');
});

test('what do you do gives the detailed help message', async () => {
  const result = await route(event('IntentRequest', 'AboutEyeRestIntent'));
  assert.equal(result.response.shouldEndSession, false);
  assert.match(result.response.outputSpeech.text, /four 30 second eye breaks/i);
  assert.match(result.response.outputSpeech.text, /replaces any earlier/i);
});

test('missing permission returns Alexa permissions card', async () => {
  const result = await route(event('IntentRequest', 'StartEyeRestIntent', false));
  assert.equal(result.response.card.type, 'AskForPermissionsConsent');
  assert.deepEqual(result.response.card.permissions, [REMINDERS_PERMISSION]);
});

test('cancel reports canceled schedule', async () => {
  const result = await route(event('IntentRequest', 'CancelEyeRestIntent'), {
    createSchedule: async () => {},
    cancelSchedule: async () => 9
  });
  assert.match(result.response.outputSpeech.text, /canceled/i);
});
