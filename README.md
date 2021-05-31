# Slack Todo App
This is a Slack app that I created to replace the todo-list my wife and I keep on our refrigerator.
We've installed it to our family workspace, and it helps us keep track of all the tasks we need to get
done. It lets you allocate who should do which task, and it will remind you about todays tasks throughout 
the afternoon until you either mark the todo as done or politely ask the app to shut up.

It's not publicly distributed, so you will need to clone and run/deploy this repo somewhere, and set up
a Slack app to go with it. See instructions below.


## APIs
1. [Slack Events API](https://api.slack.com/events)
2. [Slack Web API](https://api.slack.com/web)

## Features
- Add/remove todos for specific dates, choose whether recurring or one-time.
- Sends message to Slack channel with reminders every two hours.
- Option to turn off reminders.
- Select person responsible for task. If multiple people selected and task is recurring, responsibility
will rotate.

## User Flow
1. Add todos from app's home tab, or directly from channel.
2. App will send a message to channel every morning with the day's todo list.
3. Starting at 3:15 PM, app will send reminders every other hour for unfinished tasks.
4. Reminder message has buttons with option to stop reminder, and mark task as finished.
5. At end of day, app will send message reporting any unfinished tasks.
6. Any unfinished tasks that aren't recurring carry over to the next day.

## Tech Stack
Node.js, Express, SQLite, 

## How to use

## Upcoming Changes/Next Steps
- Update database and give recurring tasks their own table.
- Create functionality to edit todos.
- Add Slack slash commands to add todos, and list todos.
- Make app publicly available and publish in Slack's app directory.
