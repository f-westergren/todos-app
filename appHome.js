const axios = require('axios');
const moment = require('moment');
const { API_URL, DB_URL, DB_HEADERS, SLACK_HEADERS, TZ } = require('./config');
const { section, button } = require('./blocks');

const buttons = {
	type: 'actions',
	block_id: 'add-todo',
	elements: [
		button('Add Todo', 'add-todo', 'add-todo', 'primary'),
		button('Mark Todo as Done', 'mark-done-home', 'mark-done-home', 'primary'),
		button('Delete Todos', 'delete-todo', 'delete-todo')
	]
};

const updateTodoBlocks = async () => {
	let todaysTodos = [];
	let blocks = [ section(`*Today's Todo List* - ${moment.tz(TZ).format('dddd, MMMM Do YYYY')}`) ];

	try {
		const result = await axios.get(`${DB_URL}/${moment.tz(TZ).format('YYYY-MM-DD')}`, DB_HEADERS);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	if (todaysTodos.length > 0) {
		for (const t of todaysTodos) {
			blocks.push(section(t.done ? `:white_check_mark: ~${t.task}~` : `:white_square: ${t.task}`, t.task), {
				type: 'divider'
			});
		}
	} else {
		blocks.push(section(`Nothing to do today!`));
	}
	blocks.push(buttons);

	return JSON.stringify(blocks);
};

const displayHome = async (user, data) => {
	if (data) {
		try {
			await axios.post(DB_URL, data, DB_HEADERS);
		} catch (error) {
			console.log(error);
		}
	}

	const args = {
		user_id: user,
		view: {
			type: 'home',
			blocks: await updateTodoBlocks()
		}
	};

	try {
		const result = await axios.post(`${API_URL}/views.publish`, args, SLACK_HEADERS);
		if (result.data.error) console.log(result.data.error);
	} catch (err) {
		console.log(err);
	}
};

module.exports = { displayHome };
