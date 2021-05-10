const axios = require('axios');
const moment = require('moment');

const apiUrl = 'https://slack.com/api';
const dbUrl = process.env.DB_URL || 'http://localhost:3000/todos';

const { section, button } = require('./blocks');

const config = {
	headers: {
		Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
		'Content-type': 'application/json;charset=utf8'
	}
};

const addTodoBtn = {
	type: 'actions',
	block_id: 'add-todo',
	elements: [ button('Add Todo', 'add-todo', 'primary') ]
};

const sendTodos = async (channel) => {
	let todaysTodos = [];

	try {
		const result = await axios.get(`${dbUrl}/${moment().format('YYYY-MM-DD')}`);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	let blocks = [
		section(
			"Good morning, friends! Today's gonna be an amazing day :smile: \n Today you need to take care of the following:"
		)
	];

	if (todaysTodos.length > 0) {
		let todos = [];
		for (const t of todaysTodos) {
			todos.push(t.done ? `:white_check_mark: ~${t.task}~` : `:white_square: ${t.task}`);
		}

		blocks.push(
			section(todos.join('\n')),
			section(
				'If you want to mark a todo as :white_check_mark:, head over to my <slack://app?team=T01RDT7BASU&id=A01TNJG81LZ&tab=home|home tab>.'
			)
		);
	} else {
		blocks = [ section("Wow, today's todo list is completely empty so far! Enjoy the day! :sunglasses:") ];
	}

	blocks.push(addTodoBtn);

	const args = {
		text: "Check out today's todo list!",
		channel: channel,
		blocks
	};
	const result = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

	try {
		if (result.data.error) {
			console.log(result.data.error);
		}
	} catch (err) {
		console.log(err);
	}
};

const sendReminders = async () => {
	let todaysTodos = [];
	try {
		const result = await axios.get(`${dbUrl}/${moment().format('YYYY-MM-DD')}`);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	// Filter out todos that are marked as done or where reminders are turned off.
	todaysTodos = todaysTodos.filter((t) => !t.done && t.reminder);

	for (const t of todaysTodos) {
		let user = t.rotate ? `<@${t.rotate.split(',')[0]}>` : 'guys';
		let blocks = [
			section(`Hey ${user}, just a friendly reminder, you still haven't done this:`),
			section(`:white_square: ${t.task}`),
			{
				type: 'actions',
				elements: [
					button('Mark as done', t.id, 'mark-done-channel', 'primary'),
					button('Stop reminding me', t.id, 'stop-reminder')
				]
			}
		];

		const args = {
			channel: process.env.SLACK_CHANNEL,
			text: "There's something you need to do!",
			blocks: JSON.stringify(blocks)
		};

		const result = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

		try {
			if (result.data.error) {
				console.log(result.data.error);
			}
		} catch (err) {
			console.log(err);
		}
	}
};

const endOfDay = async () => {
	let todaysTodos = [];

	const addTime = (num, time) => {
		let today = moment();
		today = moment(today, 'YYYY-MM-DD').add(num, time);

		return (today = today.format('YYYY-MM-DD'));
	};

	const rotateUser = (users) => {
		users = users.split(',');
		users.unshift(users.pop());
		return users.join();
	};

	try {
		const result = await axios.get(`${dbUrl}/${moment().format('YYYY-MM-DD')}`);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	for (const t of todaysTodos) {
		if (t.recurring === 'every-day') t.date = addTime(1, 'days');
		else if (t.recurring === 'every-other-day') t.date = addTime(2, 'days');
		else if (t.recurring === 'every-week') t.date = addTime(1, 'weeks');
		else if (t.recurring === 'every-other-week') t.date = addTime(2, 'weeks');
		else if (t.recurring === 'every-month') t.date = addTime(1, 'months');
		else if (t.recurring === 'every-other-month') t.date = addTime(2, 'months');

		if (t.rotate) t.rotate = rotateUser(t.rotate);

		// Add recurring todos to database
		if (t.done && t.recurring !== 'no') {
			t.done = false;
			await axios.post(dbUrl, t);
		}

		// If todo wasn't completed, and isn't recurring, add it to database.
		if (!t.done && t.recurring === 'no') {
			t.date = t.date = addTime(1, 'days');
			await axios.post(dbUrl, t);
		}
	}

	todaysTodos = todaysTodos.filter((t) => !t.done);

	let blocks = [];

	if (todaysTodos.length > 0) {
		blocks = [
			section("Hopefully you're sleeping now. Just FYI though, there were a few things that didn't get done today: ")
		];
		let todos = [];
		for (const t of todaysTodos) {
			todos.push(`:x: ${t.task}`);
		}
		blocks.push(section(todos.join('\n')));
	}

	const args = {
		channel: process.env.SLACK_CHANNEL,
		text: 'End of day report',
		blocks: JSON.stringify(blocks)
	};

	const result = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

	try {
		if (result.data.error) {
			console.log(result.data.error);
		}
	} catch (err) {
		console.log(err);
	}
};

module.exports = { sendTodos, sendReminders, endOfDay };
