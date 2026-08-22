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
  assert.match(result.response.outputSpeech.text, /Would you like to start/i);
});

test('start creates relative schedule and confirms 90 minutes', async () => {
  let input;
  const result = await route(event('IntentRequest', 'StartEyeRestIntent'), {
    createSchedule: async value => { input = value; },
    cancelSchedule: async () => 0
  });
  assert.equal(input.schedule.length, 9);
  assert.equal(input.schedule[0].offsetSeconds, 1200);
  assert.match(result.response.outputSpeech.text, /90 minutes/i);
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
