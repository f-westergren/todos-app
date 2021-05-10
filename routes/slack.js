const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');
const apiUrl = 'https://slack.com/api';
const dbUrl = process.env.DB_URL || 'http://localhost:3000/todos';

const appHome = require('../appHome');
const appMessages = require('../appMessages');
const appModals = require('../appModals');
const signature = require('../verifySignature');

const rawBodyBuffer = (req, res, buf, encoding) => {
	if (buf && buf.length) {
		req.rawBody = buf.toString(encoding || 'utf8');
	}
};

const config = {
	headers: {
		Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
		'Content-type': 'application/json;charset=utf8'
	}
};

router.use(express.urlencoded({ verify: rawBodyBuffer, extended: true }));
router.use(express.json({ verify: rawBodyBuffer }));

// Send daily todo list every day at 9 AM
const sendDailyTodoList = cron.schedule('0 9 * * *', () => {
	appMessages.sendTodos(process.env.SLACK_CHANNEL);
});
sendDailyTodoList.start();

// Until todos are finished, send reminders every other hour from 15:15.
const sendReminders = cron.schedule('15 15,19,21,23 * * *', () => {
	appMessages.sendReminders();
});
sendReminders.start();
// Update todo list at end of day, and send message if there are still todos left.
const endOfDayUpdate = cron.schedule('30 23 * * *', () => {
	appMessages.endOfDay();
});
endOfDayUpdate.start();

router.post('/events', async (req, res) => {
	switch (req.body.type) {
		case 'url_verification': {
			// verify Events API endpoint by returning challenge if present
			res.send({ challenge: req.body.challenge });
			break;
		}

		case 'event_callback': {
			// Verify the signing secret
			if (!signature.isVerified(req)) {
				res.sendStatus(404);
				return;
			} else {
				res.send(''); // Make sure to respond to the server to avoid an error
				// Request is verified --
				const { type, user } = req.body.event;
				// Triggered when the App Home is opened by a user
				if (type === 'app_home_opened') {
					// Display App Home
					appHome.displayHome(user);
				}
			}
			break;
		}
		default: {
			res.sendStatus(404);
		}
	}
});

router.post('/actions', async (req, res, next) => {
	res.send('');
	const { trigger_id, user, actions, type, view, container, message } = JSON.parse(req.body.payload);
	if (actions && actions[0].action_id.match(/add-todo/)) {
		// Open a modal window with forms to be submitted by a user

		// If modal is opened from a message, pass that information in modal.
		if (container.type === 'message') {
			appModals.addTodo(trigger_id, container.channel_id);
		} else {
			appModals.addTodo(trigger_id);
		}
	} else if (actions && actions[0].action_id.match(/mark-done-home/)) {
		// Opens up mark as done modal from app home
		appModals.markTodo(trigger_id);
	} else if (actions && actions[0].action_id.match(/mark-done-channel/)) {
		// Marks todo as done when user clicks 'Mark as done' in channel message.
		const data = {
			table: 'todos',
			data: {
				done: true
			}
		};
		try {
			axios.patch(`${dbUrl}/${data.table}`, data);
		} catch (err) {
			return next(err);
		}

		// Grabs the todo text and strips the initial :white_square: emoji.
		const todo = message.blocks[1].text.text.slice(15);
		const args = {
			channel: container.channel_id,
			text: `Well done, <@${user.id}>! I've marked "${todo}" as done!`
		};

		const result = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

		try {
			if (result.data.error) {
				console.log(result.data.error);
			}
		} catch (err) {
			return next(err);
		}
	} else if (actions && actions[0].action_id.match(/stop-reminder/)) {
		// Turns off reminders when user clicks 'Stop reminding me' in channel message.
		const data = {
			table: 'todos',
			data: {
				reminder: false
			}
		};
		try {
			axios.patch(`${dbUrl}/${data.table}`, data);
		} catch (err) {
			return next(err);
		}

		// Grabs the todo text and strips the initial :white_square: emoji.
		const todo = message.blocks[1].text.text.slice(15);
		const args = {
			channel: container.channel_id,
			text: `Okay, <@${user.id}>! I'll stop reminding you about "${todo}".`
		};

		const result = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

		try {
			if (result.data.error) {
				console.log(result.data.error);
			}
		} catch (err) {
			return next(err);
		}
	} else if (actions && actions[0].action_id === 'delete-todo') {
		appModals.deleteTodo(trigger_id);
	} else if (actions && actions[0].action_id === 'delete-todo-date') {
		appModals.deleteTodo(trigger_id, actions[0].selected_date, view.id);
	} else if (actions && actions[0].action_id.match(/delete-/)) {
		try {
			axios.delete(`${dbUrl}/${actions[0].value}`);
		} catch (err) {
			return next(err);
		}
		appModals.deleteTodo(trigger_id, actions[0].block_id, view.id);
	} else if (view && view.callback_id.match(/add-todo-modal/)) {
		// Modal forms submitted --
		// TODO: Fix over 10...

		// If the modal was triggered in a channel, post a message acknowledging todo was added
		if (view.private_metadata !== '') {
			const args = {
				user: user.id,
				channel: view.private_metadata,
				text: 'Added todo!'
			};

			const result = await axios.post(`${apiUrl}/chat.postEphemeral`, args, config);

			try {
				if (result.data.error) {
					console.log(result.data.error);
				}
			} catch (err) {
				return next(err);
			}
		}

		const { todo01, todo02, todo03, todo04 } = view.state.values;
		const selectedUsers = todo04.user.selected_users;
		const rotate = selectedUsers.length > 1 ? selectedUsers.join(',') : null;

		// If no user is selected for task, use user who created todo.

		const data = {
			task: todo01.task.value,
			date: todo02.date.selected_date,
			recurring: todo03.recurring.selected_option.value,
			user: user.id,
			rotate: rotate
		};

		appHome.displayHome(user.id, data);
	} else if (type === 'view_submission' && view.callback_id.match(/mark-done/)) {
		const result = await axios.get(`${dbUrl}/${moment().format('YYYY-MM-DD')}`);

		const selectedOptions = view.state.values.todos.check.selected_options;

		try {
			// Updates DB when todos are checked/unchecked
			axios.post(`${dbUrl}/view`, {
				values: selectedOptions,
				todos: result.data
			});
			appHome.displayHome(user.id);
		} catch (err) {
			return next(err);
		}

		if (selectedOptions.length > 0) {
			let todos = [];
			selectedOptions.forEach((o) => todos.push(`"${o.text.text}"`));

			todos = todos.join(', ');

			// If more than one todo, replace last comma with 'and'
			todos = todos.replace(/,([^,]*)$/, ' and' + '$1');

			const args = {
				channel: process.env.SLACK_CHANNEL,
				text: `Well done, <@${user.id}>! I've marked ${todos} as done!`
			};

			console.log(args);

			const message = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

			try {
				if (message.data.error) {
					console.log(message.data.error);
				}
			} catch (err) {
				return next(err);
			}
		}
	}

	router.post('/slash', async (req, res) => {});
});

module.exports = router;

//TODO: Delete and edit todos. Slash commands for list todos, add todo
