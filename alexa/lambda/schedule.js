'use strict';

const SESSION_MINUTES = 90;

const SCHEDULE = Object.freeze([
  {
    offsetSeconds: 20 * 60,
    kind: 'break',
    text: 'Eye rest break. Look away from the screen at something at least 20 feet away. Keep looking away for 30 seconds.'
  },
  {
    offsetSeconds: 20 * 60 + 30,
    kind: 'resume',
    text: 'Great job resting your eyes. Your play timer is resuming now.'
  },
  {
    offsetSeconds: 40 * 60 + 30,
    kind: 'break',
    text: 'Eye rest break. Look away from the screen at something at least 20 feet away. Keep looking away for 30 seconds.'
  },
  {
    offsetSeconds: 41 * 60,
    kind: 'resume',
    text: 'Great job resting your eyes. Your play timer is resuming now.'
  },
  {
    offsetSeconds: 61 * 60,
    kind: 'break',
    text: 'Eye rest break. Look away from the screen at something at least 20 feet away. Keep looking away for 30 seconds.'
  },
  {
    offsetSeconds: 61 * 60 + 30,
    kind: 'resume',
    text: 'Great job resting your eyes. Your play timer is resuming now.'
  },
  {
    offsetSeconds: 81 * 60 + 30,
    kind: 'break',
    text: 'Eye rest break. Look away from the screen at something at least 20 feet away. Keep looking away for 30 seconds.'
  },
  {
    offsetSeconds: 82 * 60,
    kind: 'resume',
    text: 'Great job resting your eyes. Your play timer is resuming for the last eight minutes.'
  },
  {
    offsetSeconds: SESSION_MINUTES * 60,
    kind: 'complete',
    text: 'Eye Rest is complete. You have reached your allotted playtime of 90 minutes. Please put the screen away and rest for the day.'
  }
]);

module.exports = { SCHEDULE, SESSION_MINUTES };
