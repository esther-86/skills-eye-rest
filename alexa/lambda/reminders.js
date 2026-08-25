'use strict';

const https = require('node:https');

function requestJson({ method, url, token, body }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const serialized = body === undefined ? '' : JSON.stringify(body);
    const request = https.request({
      method,
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(serialized)
      }
    }, response => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        let parsedBody = {};
        if (data) {
          try { parsedBody = JSON.parse(data); } catch { parsedBody = { raw: data }; }
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(parsedBody);
          return;
        }
        const error = new Error(`Alexa Reminders API returned ${response.statusCode}`);
        error.statusCode = response.statusCode;
        error.response = parsedBody;
        reject(error);
      });
    });
    request.on('error', reject);
    if (serialized) request.write(serialized);
    request.end();
  });
}

function reminderPayload(item, requestTime = new Date()) {
  return {
    requestTime: requestTime.toISOString(),
    trigger: {
      type: 'SCHEDULED_RELATIVE',
      offsetInSeconds: item.offsetSeconds
    },
    alertInfo: {
      spokenInfo: {
        content: [{ locale: 'en-US', text: item.text }]
      }
    },
    pushNotification: { status: 'ENABLED' }
  };
}

async function createSchedule({ apiEndpoint, apiAccessToken, schedule, requestTime, request = requestJson }) {
  const created = [];
  try {
    // Create sequentially so a partial failure can be rolled back reliably.
    for (const item of schedule) {
      const result = await request({
        method: 'POST',
        url: `${apiEndpoint}/v1/alerts/reminders`,
        token: apiAccessToken,
        body: reminderPayload(item, requestTime)
      });
      created.push(result.alertToken);
    }
    return created;
  } catch (error) {
    await Promise.allSettled(created.map(alertToken => request({
      method: 'DELETE',
      url: `${apiEndpoint}/v1/alerts/reminders/${encodeURIComponent(alertToken)}`,
      token: apiAccessToken
    })));
    throw error;
  }
}

async function cancelSchedule({ apiEndpoint, apiAccessToken, request = requestJson }) {
  const result = await request({
    method: 'GET',
    url: `${apiEndpoint}/v1/alerts/reminders`,
    token: apiAccessToken
  });
  const alerts = Array.isArray(result.alerts) ? result.alerts : [];
  // The Reminders API only returns reminders created by this skill.
  await Promise.all(alerts.map(alert => request({
    method: 'DELETE',
    url: `${apiEndpoint}/v1/alerts/reminders/${encodeURIComponent(alert.alertToken)}`,
    token: apiAccessToken
  })));
  return alerts.length;
}

module.exports = {
  cancelSchedule,
  createSchedule,
  reminderPayload,
  requestJson
};
