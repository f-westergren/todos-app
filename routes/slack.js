const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');
const apiUrl = 'https://slack.com/api';
const dbUrl = 'http://localhost:3000';

const appHome = require('../appHome');
const appMessages = require('../appMessages');
const appModals = require('../appModals');
const signature = require('../verifySignature');

const today = moment().format('YYYY-MM-DD');

const rawBodyBuffer = (req, res, buf, encoding) => {
	if (buf && buf.length) {
		req.rawBody = buf.toString(encoding || 'utf8');
	}
};

router.use(express.urlencoded({ verify: rawBodyBuffer, extended: true }));
router.use(express.json({ verify: rawBodyBuffer }));

const sendDailyTodoList = cron.schedule('0 9 * * *', () => {
	appMessages.sendTodos(process.env.SLACK_CHANNEL);
});
sendDailyTodoList.start();

const sendReminders = cron.schedule('0 15-23 * * *', () => {});

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
	// console.log(JSON.parse(req.body.payload));
	const { trigger_id, user, actions, type, view, container } = JSON.parse(req.body.payload);

	if (actions && actions[0].action_id.match(/add-/)) {
		// Open a modal window with forms to be submitted by a user

		// If modal is opened from a message, pass that information in modal.
		if (container.type === 'message') {
			appModals.addTodo(trigger_id, container.channel_id);
		} else {
			appModals.addTodo(trigger_id);
		}
	} else if (actions && actions[0].action_id.match(/mark-/)) {
		appModals.markTodo(trigger_id);
	} else if (type === 'view_submission' && view.callback_id.match(/add-todo/)) {
		console.log(JSON.parse(req.body.payload));
		// Modal forms submitted --
		// TODO: Fix over 10...

		// If the modal was triggered in a channel, post a message acknowledging todo was added
		if (view.private_metadata !== '') {
			const config = {
				headers: {
					Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
					'Content-type': 'application/json;charset=utf8'
				}
			};

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
		const rotate = selectedUsers.length > 1 ? true : false;

		// If no user is selected for task, use user who created todo.
		const creatingUser = selectedUsers.length > 0 ? selectedUsers.join(',') : user.id;

		const data = {
			task: todo01.task.value,
			date: todo02.date.selected_date,
			recurring: todo03.recurring.selected_option.value,
			user: creatingUser,
			rotate: rotate
		};

		appHome.displayHome(user.id, data);
	} else if (type === 'view_submission' && view.callback_id.match(/mark-done/)) {
		const result = await axios.get(`${dbUrl}/todos/${today}`);

		try {
			// Updates DB when todos are checked/unchecked
			axios.post(`${dbUrl}/todos/view`, {
				values: view.state.values.todos.check.selected_options,
				todos: result.data
			});
			appHome.displayHome(user.id);
		} catch (err) {
			return next(err);
		}
	}

	router.post('/slash', async (req, res) => {});
});

module.exports = router;
