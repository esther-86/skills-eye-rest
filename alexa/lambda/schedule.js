'use strict';

const DEFAULT_PERIODS = 5;
const MIN_PERIODS = 1;
const MAX_PERIODS = 5;
const FOCUS_SECONDS = 20 * 60;
const BREAK_SECONDS = 30;

function sessionSeconds(periods) {
  return periods * FOCUS_SECONDS + (periods - 1) * BREAK_SECONDS;
}

function buildSchedule(periods = DEFAULT_PERIODS) {
  if (!Number.isInteger(periods) || periods < MIN_PERIODS || periods > MAX_PERIODS) {
    throw new RangeError(`Focus periods must be an integer from ${MIN_PERIODS} to ${MAX_PERIODS}.`);
  }

  const schedule = [];
  for (let completedPeriods = 1; completedPeriods < periods; completedPeriods += 1) {
    const breakOffset = completedPeriods * FOCUS_SECONDS + (completedPeriods - 1) * BREAK_SECONDS;
    schedule.push({
      offsetSeconds: breakOffset,
      kind: 'break',
      text: 'Eye break. Look away from the screen at something at least 20 feet away. Keep looking away for 30 seconds.'
    });
    schedule.push({
      offsetSeconds: breakOffset + BREAK_SECONDS,
      kind: 'resume',
      text: 'Your eye break is complete. Your focus period is resuming now.'
    });
  }

  schedule.push({
    offsetSeconds: sessionSeconds(periods),
    kind: 'complete',
    text: `Vision Stop is complete. Your ${periods} focus ${periods === 1 ? 'period has' : 'periods have'} ended. Consider taking a longer break before returning to the screen.`
  });
  return Object.freeze(schedule);
}

const SCHEDULE = buildSchedule();

module.exports = {
  BREAK_SECONDS,
  DEFAULT_PERIODS,
  FOCUS_SECONDS,
  MAX_PERIODS,
  MIN_PERIODS,
  SCHEDULE,
  buildSchedule,
  sessionSeconds
};
