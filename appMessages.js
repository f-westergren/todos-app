const axios = require('axios');
const moment = require('moment');

const { API_URL, DB_URL, DB_HEADERS, SLACK_HEADERS, SLACK_TEAM_ID, SLACK_APP_ID, SLACK_CHANNEL, TZ } = require('./config');
const { section, button } = require('./blocks');

const addTodoBtn = {
	type: 'actions',
	block_id: 'add-todo',
	elements: [ button('Add Todo', 'add-todo', 'primary') ]
};

const sendTodos = async (channel) => {
	let todaysTodos = [];

	try {
		const result = await axios.get(`${DB_URL}/${moment.tz(TZ).format('YYYY-MM-DD')}`, DB_HEADERS);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	let blocks = [ section('Good morning, friends! \n Today you need to take care of the following:') ];

	if (todaysTodos.length > 0) {
		let todos = [];
		for (const t of todaysTodos) {
			todos.push(t.done ? `:white_check_mark: ~${t.task}~` : `:white_square: ${t.task}`);
		}

		blocks.push(
			section(todos.join('\n')),
			section(
				`If you want to mark a todo as :white_check_mark:, head over to my <slack://app?team=${SLACK_TEAM_ID}&id=${SLACK_APP_ID}&tab=home|home tab>.`
			)
		);
	} else {
		blocks = [ section("Wow, today's todo list is completely empty so far! Enjoy the day! :sunglasses:") ];
	}

	blocks.push(addTodoBtn);

	const args = {
		text: "Check out today's todo list!",
		channel,
		blocks
	};

	try {
		const result = await axios.post(`${API_URL}/chat.postMessage`, args, SLACK_HEADERS);
		if (result.data.error) console.log(result.data.error);
	} catch (err) {
		console.log(err.message)
	}
};

const sendReminders = async () => {
	let todaysTodos = [];
	try {
		const result = await axios.get(`${DB_URL}/${moment.tz(TZ).format('YYYY-MM-DD')}`, DB_HEADERS);
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
			channel: SLACK_CHANNEL,
			text: "There's something you need to do!",
			blocks: JSON.stringify(blocks)
		};

		try {
			const result = await axios.post(`${API_URL}/chat.postMessage`, args, SLACK_HEADERS);
			if (result.data.error) console.log(result.data.error);
		} catch (err) {
			console.log(err.message);
		}
	}
};

const endOfDay = async () => {
	let todaysTodos = [];

	const addTime = (num, time) => {
		let today = moment().tz(TZ);
		today = moment(today, 'YYYY-MM-DD').add(num, time);

		return (today = today.format('YYYY-MM-DD'));
	};

	const rotateUser = (users) => {
		users = users.split(',');
		users.unshift(users.pop());
		return users.join();
	};

	try {
		const result = await axios.get(`${DB_URL}/${moment.tz(TZ).format('YYYY-MM-DD')}`, DB_HEADERS);
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

		// Add recurring todos to DB with next date, change 'done' to false before adding to DB.
		if (t.recurring !== 'no') {
      if (t.done = true) {
        t.done = false
        await axios.post(DB_URL, t, DB_HEADERS);
        t.done = true
      } else {
        await axios.post(DB_URL, t, DB_HEADERS);
      }
			
		}

		// If todo wasn't completed, and isn't recurring, add it to next day in DB.
		if (!t.done && t.recurring === 'no') {
			t.date = t.date = addTime(1, 'days');
			await axios.post(DB_URL, t, DB_HEADERS);
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
      if (!t.done) todos.push(`:x: ${t.task}`);
		}
		blocks.push(section(todos.join('\n')));
	}

	const args = {
		channel: SLACK_CHANNEL,
		text: 'End of day report',
		blocks: JSON.stringify(blocks)
	};

	try {
		const result = await axios.post(`${API_URL}/chat.postMessage`, args, SLACK_HEADERS);
		if (result.data.error) console.log(result.data.error);
	} catch (err) {
		console.log(err.message);
	}
};

module.exports = { sendTodos, sendReminders, endOfDay };