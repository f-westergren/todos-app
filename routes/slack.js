const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');

const { API_URL, DB_URL, SLACK_CHANNEL, DB_HEADERS, SLACK_HEADERS, TZ } = require('../config');

const appHome = require('../appHome');
const appModals = require('../appModals');
const appActions = require('../appActions');
const signature = require('../verifySignature');

const rawBodyBuffer = (req, res, buf, encoding) => {
	if (buf && buf.length) {
		req.rawBody = buf.toString(encoding || 'utf8');
	}
};

router.use(express.urlencoded({ verify: rawBodyBuffer, extended: true }));
router.use(express.json({ verify: rawBodyBuffer }));

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
		appActions.updateTodo(actions[0].value, { done: true });
    

		// Grabs the todo text and strips the initial :white_square: emoji.
		const todo = message.blocks[1].text.text.slice(15);
		const args = {
			channel: container.channel_id,
			text: `Well done, <@${user.id}>! I've marked "${todo}" as done!`
		};
		try {
			const result = await axios.post(`${API_URL}/chat.postMessage`, args, SLACK_HEADERS);
			if (result.data.error) console.log(result.data.error);
		} catch (err) {
			return next(err);
		}
	} else if (actions && actions[0].action_id.match(/stop-reminder/)) {
		// Turns off reminders when user clicks 'Stop reminding me' in channel message.
		appActions.updateTodo(actions[0].value, { reminder: false });

		// Grabs the todo text and strips the initial :white_square: emoji.
		const todo = message.blocks[1].text.text.slice(15);
		const args = {
			channel: container.channel_id,
			text: `Okay, <@${user.id}>! I'll stop reminding you about "${todo}".`
		};
		try {
			const result = await axios.post(`${API_URL}/chat.postMessage`, args, SLACK_HEADERS);
			if (result.data.error) console.log(result.data.error);
		} catch (err) {
			return next(err);
		}
	} else if (actions && actions[0].action_id === 'delete-todo') {
		appModals.deleteTodo(trigger_id);
	} else if (actions && actions[0].action_id === 'delete-todo-date') {
		appModals.deleteTodo(trigger_id, actions[0].selected_date, view.id);
	} else if (actions && actions[0].action_id.match(/delete-/)) {
		try {
			axios.delete(`${DB_URL}/${actions[0].value}`, DB_HEADERS);
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

			try {
				const result = await axios.post(`${API_URL}/chat.postEphemeral`, args, SLACK_HEADERS);
				if (result.data.error) console.log(result.data.error);
			} catch (err) {
				return next(err);
			}
		}

		const { todo01, todo02, todo03, todo04 } = view.state.values;
		const selectedUsers = todo04.user.selected_users;
		const rotate = selectedUsers.length > 0 ? selectedUsers.join(',') : null;

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
		const result = await axios.get(`${DB_URL}/${moment.tz(TZ).format('YYYY-MM-DD')}`, DB_HEADERS);

		const alreadyFinished = view.private_metadata;
		const selectedOptions = view.state.values.todos.check.selected_options;

		try {
			// Updates DB when todos are checked/unchecked
			axios.post(
				`${DB_URL}/view`,
				{
					values: selectedOptions,
					todos: result.data
				},
				DB_HEADERS
			);
			appHome.displayHome(user.id);
		} catch (err) {
			return next(err);
		}

		// This creates the message to send when a todo is marked as done. Only todos that weren't
		// already marked as finished will be posted.
		if (selectedOptions.length > alreadyFinished.split(',').length) {
			let todos = [];

			selectedOptions.forEach((o) => {
				if (!alreadyFinished.match(o.text.text)) todos.push(`"${o.text.text}"`);
			});

			todos = todos.join(', ');
			// If more than one todo, replace last comma with 'and'
			todos = todos.replace(/,([^,]*)$/, ' and' + '$1');

			const args = {
				channel: SLACK_CHANNEL,
				text: `Well done, <@${user.id}>! I've marked ${todos} as done!`
			};

			try {
				const message = await axios.post(`${API_URL}/chat.postMessage`, args, SLACK_HEADERS);
				if (message.data.error) console.log(message.data.error);
			} catch (err) {
				return next(err);
			}
		}
	}

	router.post('/slash', async (req, res) => {});
});

module.exports = router;