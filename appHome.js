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
	let blocks = [ section(`*Today's Todo List* - ${moment().format('dddd, MMMM Do YYYY')}`) ];

	try {
		const result = await axios.get(`${dbUrl}/${moment().format('YYYY-MM-DD')}`);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	if (todaysTodos.length > 0) {
		for (const t of todaysTodos) {
			blocks.push(section(t.done ? `:white_check_mark: ~${t.task}~` : `:white_square: ${t.task}`), {
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
			await axios.post(`${dbUrl}`, data);
		} catch (error) {
			return next(err);
		}
	}

	const args = {
		user_id: user,
		view: {
			type: 'home',
			blocks: await updateTodoBlocks()
		}
	};

	const result = await axios.post(`${apiUrl}/views.publish`, args, config);

	try {
		if (result.data.error) {
			console.log(result.data.error);
		}
	} catch (err) {
		console.log(err.message);
	}
};

module.exports = { displayHome };
