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

function hasReminderPermission(event) {
  const status = systemContext(event).user?.permissions?.consentToken;
  return Boolean(status);
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
  if (!hasReminderPermission(event)) {
    return response(
      'Vision Stop needs permission to announce eye breaks during your screen-use session. Please enable Reminders permission in the Alexa app, then open Vision Stop again.',
      { card: permissionCard() }
    );
  }

  const system = systemContext(event);
  try {
    // Replace any earlier Vision Stop reminders so sessions never overlap.
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
      return response('Vision Stop started for one 20-minute focus period.');
    }
    return response('Your first eye break is in 20 minutes.');
  } catch (error) {
    console.error('Unable to create Vision Stop reminders', error);
    if (error.statusCode === 401 || error.statusCode === 403) {
      return response('I could not access reminders. Please enable Reminders permission for Vision Stop in the Alexa app and try again.', { card: permissionCard() });
    }
    return response('I could not start the Vision Stop schedule right now. Please try again in a moment.');
  }
}

async function cancel(event, deps) {
  if (!hasReminderPermission(event)) {
    return response('There is no Vision Stop session I can cancel.');
  }
  const system = systemContext(event);
  try {
    const count = await deps.cancelSchedule({
      apiEndpoint: system.apiEndpoint,
      apiAccessToken: system.apiAccessToken
    });
    return response(count ? 'Your Vision Stop session has been canceled.' : 'There is no active Vision Stop session to cancel.');
  } catch (error) {
    console.error('Unable to cancel Vision Stop reminders', error);
    return response('I could not cancel the Vision Stop reminders. Please try again.');
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
      case 'StartVisionStopIntent':
        return start(event, deps);
      case 'AMAZON.NoIntent':
        return response(
          'How many 20-minute focus periods would you like, from one to five?',
          { reprompt: 'Say a number from one to five.', endSession: false }
        );
      case 'NumberOfPeriodsIntent':
        return start(event, deps, requestedPeriods(event));
      case 'CancelVisionStopIntent':
      case 'AMAZON.CancelIntent':
      case 'AMAZON.StopIntent':
        return cancel(event, deps);
      case 'AMAZON.HelpIntent':
      case 'AboutVisionStopIntent':
        return response(
          'Vision Stop schedules one to five 20-minute focus periods, with a 30 second eye break between periods. Five periods is the default. Say start vision stop to use the default, or say a number from one to five.',
          { reprompt: 'Say start vision stop, or choose a number from one to five.', endSession: false }
        );
      case 'AMAZON.FallbackIntent':
        return response('I did not understand that. Say start vision stop, cancel vision stop, or help.', { reprompt: 'What would you like to do?', endSession: false });
      default:
        return response('I did not understand that. Say help to hear what Vision Stop can do.');
    }
  }

  if (requestType(event) === 'SessionEndedRequest') return { version: '1.0', response: {} };
  return response('I could not process that request. Please try again.');
}

exports.handler = async event => route(event);
exports.route = route;
exports.hasReminderPermission = hasReminderPermission;
exports.REMINDERS_PERMISSION = REMINDERS_PERMISSION;
exports.requestedPeriods = requestedPeriods;
