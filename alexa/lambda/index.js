'use strict';

const { SCHEDULE } = require('./schedule');
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

async function start(event, deps) {
  if (!hasReminderPermission(event)) {
    return response(
      'Eye Rest needs permission to announce eye breaks during your screen-use session. Please enable Reminders permission in the Alexa app, then open Eye Rest again.',
      { card: permissionCard() }
    );
  }

  const system = systemContext(event);
  try {
    // Replace any earlier Eye Rest reminders so sessions never overlap.
    await deps.cancelSchedule({
      apiEndpoint: system.apiEndpoint,
      apiAccessToken: system.apiAccessToken
    });
    await deps.createSchedule({
      apiEndpoint: system.apiEndpoint,
      apiAccessToken: system.apiAccessToken,
      schedule: SCHEDULE
    });
    return response('Eye Rest has started. I set four eye break reminders, four resume reminders, and one session ending reminder over the next 90 minutes. Your first eye break is in 20 minutes.');
  } catch (error) {
    console.error('Unable to create Eye Rest reminders', error);
    if (error.statusCode === 401 || error.statusCode === 403) {
      return response('I could not access reminders. Please enable Reminders permission for Eye Rest in the Alexa app and try again.', { card: permissionCard() });
    }
    return response('I could not start the Eye Rest schedule right now. Please try again in a moment.');
  }
}

async function cancel(event, deps) {
  if (!hasReminderPermission(event)) {
    return response('There is no Eye Rest session I can cancel.');
  }
  const system = systemContext(event);
  try {
    const count = await deps.cancelSchedule({
      apiEndpoint: system.apiEndpoint,
      apiAccessToken: system.apiAccessToken
    });
    return response(count ? 'Your Eye Rest session has been canceled.' : 'There is no active Eye Rest session to cancel.');
  } catch (error) {
    console.error('Unable to cancel Eye Rest reminders', error);
    return response('I could not cancel the Eye Rest reminders. Please try again.');
  }
}

async function route(event, deps = reminders) {
  if (requestType(event) === 'LaunchRequest') {
    return response(
      'Welcome to Eye Rest. I can use Alexa reminders to schedule four 30 second eye breaks during a 90 minute screen-use session. Starting now will replace any earlier Eye Rest session. Would you like me to set these reminders?',
      { reprompt: 'Would you like to start Eye Rest?', endSession: false }
    );
  }

  if (requestType(event) === 'IntentRequest') {
    switch (intentName(event)) {
      case 'AMAZON.YesIntent':
      case 'StartEyeRestIntent':
        return start(event, deps);
      case 'AMAZON.NoIntent':
        return response('Okay. Eye Rest was not started.');
      case 'CancelEyeRestIntent':
      case 'AMAZON.CancelIntent':
      case 'AMAZON.StopIntent':
        return cancel(event, deps);
      case 'AMAZON.HelpIntent':
        return response(
          'Eye Rest schedules a 30 second eye break after each 20 minute screen-use period, for up to 90 minutes. Say start eye rest to begin, or cancel eye rest to stop.',
          { reprompt: 'Say start eye rest to begin.', endSession: false }
        );
      case 'AMAZON.FallbackIntent':
        return response('I did not understand that. Say start eye rest, cancel eye rest, or help.', { reprompt: 'What would you like to do?', endSession: false });
      default:
        return response('I did not understand that. Say help to hear what Eye Rest can do.');
    }
  }

  if (requestType(event) === 'SessionEndedRequest') return { version: '1.0', response: {} };
  return response('I could not process that request. Please try again.');
}

exports.handler = async event => route(event);
exports.route = route;
exports.hasReminderPermission = hasReminderPermission;
exports.REMINDERS_PERMISSION = REMINDERS_PERMISSION;
