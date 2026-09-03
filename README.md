# Vision Pause

Vision Pause is a general-audience productivity tool for adults who use screens. It provides complete 20-minute focus periods separated by 30-second eye breaks on two voice platforms:

- An Alexa custom skill that creates spoken reminders relative to the moment the skill starts.
- A Google Home scripted household automation for Google Nest speakers and displays.

Google discontinued third-party Conversational Actions, so the Nest version is a household automation rather than a published conversational Action.

## Default five-period schedule

| Time from start | Announcement |
| ---: | --- |
| 0:00 | Session started |
| 20:00 | Look at least 20 feet away for 30 seconds |
| 20:30 | Resume |
| 40:30 | Look away |
| 41:00 | Resume |
| 61:00 | Look away |
| 61:30 | Resume |
| 81:30 | Look away |
| 82:00 | Resume for the fifth 20-minute focus period |
| 102:00 | Screen-use session ends; consider a longer break |

On Alexa, opening Vision Pause offers five focus periods by default. Answer “no” to choose from one to five periods. The total durations are 20, 40.5, 61, 81.5, or 102 minutes. Google Home uses the default five-period schedule.

## Lowest-cost Alexa deployment (recommended)

Use **Alexa-hosted Node.js**. It does not require a separate AWS account, Lambda configuration, or paid server. Amazon hosts the code within the allowances provided for Alexa-hosted skills.

Prerequisite: a free [Amazon Developer account](https://developer.amazon.com/). Node.js is needed on your computer only to run the local tests.

1. Open the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) and select **Create Skill**.
2. Name it **Vision Pause**, choose **English (US)**, and continue.
3. Choose **Other** for the experience and **Custom** for the model.
4. Under **Hosting services**, choose **Alexa-hosted (Node.js)**. Select the hosting region closest to you.
5. Choose **Start from Scratch**, review the selections, and create the skill. Amazon provisions the hosted endpoint automatically; do not create an AWS Lambda function.
6. On **Build > Interaction Model > JSON Editor**, replace the editor contents with `alexa/skill-package/interactionModels/custom/en-US.json`. Save and select **Build Skill**.
7. On the **Code** tab:
   - Replace `lambda/index.js` with `alexa/lambda/index.js` from this project.
   - Create `lambda/schedule.js` and paste in `alexa/lambda/schedule.js`.
   - Create `lambda/reminders.js` and paste in `alexa/lambda/reminders.js`.
   - The generated `lambda/package.json` may be left in place. Vision Pause uses only Node.js built-ins and does not require another package.
   - Select **Save**, then **Deploy**.
8. Under **Build > Permissions**, enable **Reminders**. The account using the Echo must also grant Vision Pause permission in the Alexa app.
9. On the **Test** tab, change testing to **Development**, enter `open vision pause`, and confirm that Alexa offers five 20-minute focus periods.
10. On an Echo signed in to the same Amazon account, say: “Alexa, open Vision Pause.” Grant Reminders permission in the Alexa app when prompted.

The files under `alexa/skill-package` are also suitable for an advanced ASK CLI or self-hosted deployment, but neither is needed for the lowest-cost setup.

Alexa requires both account permission and spoken confirmation before a skill creates reminders. Vision Pause asks “Start five 20-minute focus periods?” Answer “yes” for five, or answer “no” and choose a number from one to five.

Starting a new session removes any earlier Vision Pause reminders before creating the new schedule, which prevents overlapping sessions. To cancel, say: “Alexa, ask Vision Pause to cancel my session.” The Alexa Reminders API exposes only reminders created by this skill, and Vision Pause removes all of them when canceling.

## Lowest-cost Google Nest setup (recommended)

Use Google Home's built-in household script editor. There is no server, cloud project, or paid third-party service to deploy for this version.

1. Open the Google Home app and join **Public Preview** if the script editor is not available. You can also use [Google Home for web](https://home.google.com/automations); this is the recommended creation route on iPhone or iPad.
2. Go to **Automations > Add > Household > More options > Script editor**. The editor is also available at [home.google.com](https://home.google.com/automations).
3. Paste `google-home/eye-rest.yaml` into the editor.
4. Optionally restrict each broadcast to one speaker. Under every `assistant.command.Broadcast`, add:

   ```yaml
      devices:
        - Office Speaker - Office
   ```

   Replace that value with the exact `Device name - Room name` shown in Google Home. Without `devices`, Google broadcasts throughout the home.
5. Select **Validate**, fix any device-name suggestions if applicable, save, and activate the automation.
6. Say: “Hey Google, start vision pause.”

The Google automation must remain active and depends on the Nest speaker, internet connection, and Google Home automation service. Google Home does not currently offer a third-party conversational skill equivalent to Alexa custom skills.

## Expected cost

| Platform | Recommended hosting | Expected personal-use cost |
| --- | --- | ---: |
| Alexa | Alexa-hosted Node.js | $0 within the hosted-skill allowances |
| Google Nest | Google Home household automation | $0 |

These estimates exclude the cost of the Echo/Nest hardware and internet service you already use. A future service-policy or usage-limit change could affect hosting availability, but this project has no paid API, database, subscription, or third-party hosting dependency.

## Tests

Run:

```powershell
npm test
```

The tests verify all relative offsets, selectable period counts, 30-second breaks, the 102-minute default, Alexa permission behavior, reminder creation, cancellation routing, and rollback after partial API failure.

## Important operational notes

- Starting the Alexa skill again replaces the current Vision Pause session.
- Starting the Google automation more than once may start overlapping automation runs. Stop the active automation in Google Home before restarting.
- Voice reminders and household automations rely on cloud services and should not be treated as safety-critical timers.
