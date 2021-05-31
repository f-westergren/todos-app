require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const axios = require('axios');
const cron = require('node-cron');
const appMessages = require('./appMessages');
const moment = require('moment');

const { DB_URL, SLACK_CHANNEL, DB_HEADERS, TZ } = require('./config');

app.use(morgan('tiny'));

const todoRoutes = require('./routes/todos');
const slackRoutes = require('./routes/slack');

app.use('/todos', todoRoutes);
app.use('/slack', slackRoutes);

app.use((err, req, res, next) => {
	if (err.stack) console.log(err.stack);

	res.status(err.status || 500);

	return res.json({
		error: err.status,
		message: err.message
	});
});

// Send daily todo list every day at 9 AM
const sendDailyTodoList = cron.schedule('0 9 * * *', () => {
  console.log("Sending today's list")
	appMessages.sendTodos(SLACK_CHANNEL);
},{
    scheduled: true,
    timezone: TZ
  });
sendDailyTodoList.start();

// Until todos are finished, send reminders every other hour from 15:15.
const sendReminders = cron.schedule('15 15,17,19,21,23 * * *', () => {
	appMessages.sendReminders();
},{
    scheduled: true,
    timezone: TZ
  });
sendReminders.start();

// Update todo list at end of day, and send message if there are still todos left.
const endOfDayUpdate = cron.schedule('30 23 * * *', () => {
	appMessages.endOfDay();
},{
    scheduled: true,
    timezone: TZ
  });
endOfDayUpdate.start();

app.listen(3000, () => {
	console.log(`Server is starting on 3000`);
});
