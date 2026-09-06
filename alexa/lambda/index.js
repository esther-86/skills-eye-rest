'use strict';

const { DEFAULT_PERIODS, MAX_PERIODS, MIN_PERIODS, buildSchedule } = require('./schedule');
const reminders = require('./reminders');

const REMINDERS_PERMISSION = 'alexa::alerts:reminders:skill:readwrite';

function response(speech, { reprompt, endSession = true, card, directives } = {}) {
  const value = {
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text: speech },
      shouldEndSession: endSession
    }
  };
  if (reprompt) value.response.reprompt = { outputSpeech: { type: 'PlainText', text: reprompt } };
  if (card) value.response.card = card;
  if (directives) value.response.directives = directives;
  return value;
}

function permissionCard() {
  return {
    type: 'AskForPermissionsConsent',
    permissions: [REMINDERS_PERMISSION]
  };
}

function systemContext(event) {
  return event.context?.System || {};
}

function hasReminderApiToken(event) {
  // Token presence is not consent; the Reminders API enforces permission.
  return Boolean(systemContext(event).apiAccessToken);
}

function permissionResponse() {
  return response(
    'Vision Protect cannot access your reminders. In the Alexa app, open Vision Protect, choose Settings, enable Reminders, and tap Save Permissions. Then open Vision Protect again.',
    { card: permissionCard() }
  );
}

function requestType(event) {
  return event.request?.type;
}

function intentName(event) {
  return event.request?.intent?.name;
}

function requestedPeriods(event) {
  const raw = event.request?.intent?.slots?.focusPeriods?.value;
  if (raw === undefined) return undefined;
  const periods = Number(raw);
  return Number.isInteger(periods) ? periods : NaN;
}

async function start(event, deps, periods = DEFAULT_PERIODS) {
  if (!Number.isInteger(periods) || periods < MIN_PERIODS || periods > MAX_PERIODS) {
    return response(
      'Please choose between one and five 20-minute focus periods.',
      { reprompt: 'How many focus periods would you like, from one to five?', endSession: false }
    );
  }
  if (!hasReminderApiToken(event)) {
    return permissionResponse();
  }

  const system = systemContext(event);
  try {
    // Replace any earlier Vision Protect reminders so sessions never overlap.
    await deps.cancelSchedule({
      apiEndpoint: system.apiEndpoint,
      apiAccessToken: system.apiAccessToken
    });
    await deps.createSchedule({
      apiEndpoint: system.apiEndpoint,
      apiAccessToken: system.apiAccessToken,
      schedule: buildSchedule(periods)
    });
    if (periods === 1) {
      return response('Vision Protect started for one 20-minute focus period.');
    }
    return response('Your first eye break is in 20 minutes.');
  } catch (error) {
    console.error('Unable to create Vision Protect reminders', error);
    if (error.statusCode === 401 || error.statusCode === 403) {
      return permissionResponse();
    }
    return response('I could not start the Vision Protect schedule right now. Please try again in a moment.');
  }
}

async function cancel(event, deps) {
  if (!hasReminderApiToken(event)) {
    return permissionResponse();
  }
  const system = systemContext(event);
  try {
    const count = await deps.cancelSchedule({
      apiEndpoint: system.apiEndpoint,
      apiAccessToken: system.apiAccessToken
    });
    return response(count ? 'Your Vision Protect session has been canceled.' : 'There is no active Vision Protect session to cancel.');
  } catch (error) {
    console.error('Unable to cancel Vision Protect reminders', error);
    if (error.statusCode === 401 || error.statusCode === 403) return permissionResponse();
    return response('I could not cancel the Vision Protect reminders. Please try again.');
  }
}

async function route(event, deps = reminders) {
  if (requestType(event) === 'LaunchRequest') {
    return response(
      'Start five 20-minute focus periods?',
      { reprompt: 'Would you like to start five 20-minute focus periods?', endSession: false }
    );
  }

  if (requestType(event) === 'IntentRequest') {
    switch (intentName(event)) {
      case 'AMAZON.YesIntent':
      case 'StartVisionProtectIntent':
        return start(event, deps);
      case 'AMAZON.NoIntent':
        return response(
          'How many 20-minute focus periods would you like, from one to five?',
          { reprompt: 'Say a number from one to five.', endSession: false }
        );
      case 'NumberOfPeriodsIntent':
        return start(event, deps, requestedPeriods(event));
      case 'CancelVisionProtectIntent':
      case 'AMAZON.CancelIntent':
      case 'AMAZON.StopIntent':
        return cancel(event, deps);
      case 'AMAZON.HelpIntent':
      case 'AboutVisionProtectIntent':
        return response(
          'Vision Protect schedules one to five 20-minute focus periods, with a 30 second eye break between periods. Five periods is the default. Say start vision protect to use the default, or say a number from one to five.',
          { reprompt: 'Say start vision protect, or choose a number from one to five.', endSession: false }
        );
      case 'AMAZON.FallbackIntent':
        return response('I did not understand that. Say start vision protect, cancel vision protect, or help.', { reprompt: 'What would you like to do?', endSession: false });
      default:
        return response('I did not understand that. Say help to hear what Vision Protect can do.');
    }
  }

  if (requestType(event) === 'SessionEndedRequest') return { version: '1.0', response: {} };
  return response('I could not process that request. Please try again.');
}

exports.handler = async event => route(event);
exports.route = route;
exports.hasReminderApiToken = hasReminderApiToken;
exports.REMINDERS_PERMISSION = REMINDERS_PERMISSION;
exports.requestedPeriods = requestedPeriods;
