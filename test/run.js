'use strict';

// Requiring the test files runs them in this process. This avoids child-process
// restrictions in constrained Lambda build and CI environments.
require('./schedule.test');
require('./reminders.test');
require('./skill.test');
require('./google-home.test');
