# Eye Rest

Eye Rest provides the same 90-minute, child-friendly 20-20-20 schedule on two voice platforms:

- An Alexa custom skill that creates spoken reminders relative to the moment the skill starts.
- A Google Home scripted household automation for Google Nest speakers and displays.

Google discontinued third-party Conversational Actions, so the Nest version is a household automation rather than a published conversational Action.

## Schedule

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
| 82:00 | Resume for the last eight minutes |
| 90:00 | Allotted playtime is over; rest for the day |

## Alexa deployment

Prerequisites: an Amazon Developer account, an AWS account, and Node.js 20 or newer.

1. Create an AWS Lambda function using the Node.js 20 runtime. Use `alexa/lambda/index.handler` as its handler.
2. Zip the contents of this repository so that `alexa/lambda/index.js` is included, and upload it to Lambda. The code uses only Node.js built-ins; there is no production dependency installation step.
3. Add the **Alexa Skills Kit** trigger to the Lambda function. For a public deployment, restrict it to the new skill ID.
4. In the Alexa Developer Console, create a **Custom** skill named **Eye Rest** with the **Custom** model.
5. Copy `alexa/skill-package/interactionModels/custom/en-US.json` into the JSON editor under **Build > Interaction Model** and build the model.
6. Set the skill endpoint to the Lambda ARN. If using the included manifest with ASK CLI, replace `REPLACE_WITH_LAMBDA_ARN` in `alexa/skill-package/skill.json` first.
7. Under **Build > Permissions**, enable **Reminders**. The included manifest already declares `alexa::alerts:reminders:skill:readwrite`.
8. Test the skill, grant Reminders permission in the Alexa app, and say: “Alexa, open Eye Rest.”

Alexa requires both account permission and spoken confirmation before a skill creates reminders. Eye Rest asks “Would you like to start now?” and creates the schedule only after “yes” or an explicit start command.

To cancel, say: “Alexa, ask Eye Rest to cancel my session.” Eye Rest removes only reminders whose spoken text begins with `Eye Rest:`.

## Google Nest setup

1. Open the Google Home app and join **Public Preview** if the script editor is not available.
2. Go to **Automations > Add > Household > More options > Script editor**. The editor is also available at [home.google.com](https://home.google.com/automations).
3. Paste `google-home/eye-rest.yaml` into the editor.
4. Optionally restrict each broadcast to one speaker. Under every `assistant.command.Broadcast`, add:

   ```yaml
      devices:
        - Kids Speaker - Kids Room
   ```

   Replace that value with the exact `Device name - Room name` shown in Google Home. Without `devices`, Google broadcasts throughout the home.
5. Select **Validate**, fix any device-name suggestions if applicable, save, and activate the automation.
6. Say: “Hey Google, start eye rest.”

The Google automation must remain active and depends on the Nest speaker, internet connection, and Google Home automation service. Google Home does not currently offer a third-party conversational skill equivalent to Alexa custom skills.

## Tests

Run:

```powershell
npm test
```

The tests verify all relative offsets, 30-second breaks, the 90-minute limit, Alexa permission behavior, reminder creation, cancellation routing, and rollback after partial API failure.

## Important operational notes

- Starting the Alexa skill more than once creates overlapping sessions. Cancel the current session before starting another.
- Starting the Google automation more than once may start overlapping automation runs. Stop the active automation in Google Home before restarting.
- Voice reminders and household automations rely on cloud services and should not be treated as safety-critical timers.
