const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
const apiUrl = 'https://slack.com/api';
const dbUrl = 'http://localhost:3000';

const appHome = require('../appHome');
const todo = require('../todoModal');
const signature = require('../verifySignature');

const today = moment().format('YYYY-MM-DD');

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
				const { type, user, channel, tab, text, subtype } = req.body.event;
				console.log(type);
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

router.post('/actions', async (req, res) => {
	const { trigger_id, user, actions, type, view } = JSON.parse(req.body.payload);

	if (actions && actions[0].action_id.match(/add-/)) {
		// Open a modal window with forms to be submitted by a user
		res.send('');
		todo.openModal(trigger_id);
	} else if (actions && actions[0].action_id === 'check') {
		// Get all todos from today to pass with update request.
		res.send('');
		const result = await axios.get(`${dbUrl}/todos/${today}`);

		try {
			// Updates DB when todos are checked/unchecked
			axios.post(`${dbUrl}/todos/view`, { values: actions[0].selected_options, todos: result.data });
			appHome.displayHome(user.id);
		} catch (err) {
			console.error(err);
		}
	} else if (type === 'view_submission') {
		// Modal forms submitted --
		res.send('');

		const { user, view } = JSON.parse(req.body.payload);
		const { todo01, todo02, todo03, todo04 } = view.state.values;

		// If no user is selected for task, use user who created todo.
		const creatingUser = todo04.selected_users > 0 ? todo04.selected_users[0] : user.id;

		const data = {
			task: todo01.task.value,
			date: todo02.date.selected_date,
			recurring: todo03.recurring.selected_option.value,
			user: creatingUser,
			rotate: todo04.selected_users || false
		};

		appHome.displayHome(user.id, data);
	}
});

module.exports = router;
