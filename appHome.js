const axios = require('axios');
const moment = require('moment');

const apiUrl = 'https://slack.com/api';
const dbUrl = process.env.DB_URL || 'http://localhost:3000/todos';

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
		{
			type: 'button',
			style: 'primary',
			text: {
				type: 'plain_text',
				text: 'Add Todo'
			},
			value: 'add-todo',
			action_id: 'add-todo'
		},
		{
			type: 'button',
			style: 'primary',
			text: {
				type: 'plain_text',
				text: 'Mark Todo as Done'
			},
			value: 'mark-home',
			action_id: 'mark-done-home'
		},
		{
			type: 'button',
			text: {
				type: 'plain_text',
				text: 'Delete Todos'
			},
			value: 'mark-home',
			action_id: 'delete-todo'
		}
	]
};

const updateTodoBlocks = async () => {
	let todaysTodos = [];
	let blocks = [
		{
			type: 'section',
			block_id: 'header',
			text: {
				type: 'mrkdwn',
				text: `*Today's Todo List* - ${moment().format('dddd, MMMM Do YYYY')}`
			}
		}
	];

	try {
		const result = await axios.get(`${dbUrl}/${moment().format('YYYY-MM-DD')}`);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	if (todaysTodos.length > 0) {
		for (const t of todaysTodos) {
			blocks.push(
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: t.done ? `:white_check_mark: ~${t.task}~` : `:white_square: ${t.task}`
					}
				},
				{
					type: 'divider'
				}
			);
		}
	} else {
		blocks.push({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `Nothing to do today!`
			}
		});
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
