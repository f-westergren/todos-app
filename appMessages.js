const axios = require('axios');
const moment = require('moment');

const apiUrl = 'https://slack.com/api';

const config = {
	headers: {
		Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
		'Content-type': 'application/json;charset=utf8'
	}
};

const addTodoBtn = {
	type: 'actions',
	block_id: 'add-todo',
	elements: [
		{
			type: 'button',
			text: {
				type: 'plain_text',
				text: 'Add Todo'
			},
			value: 'add-todo',
			action_id: 'add-todo'
		}
	]
};

const sendTodos = async (channel) => {
	let todaysTodos = [];

	try {
		const result = await axios.get(`${dbUrl}/todos/${moment().format('YYYY-MM-DD')}`);
		todaysTodos.push(...result.data);
	} catch (err) {
		return next(err);
	}

	let blocks = [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text:
					"Good morning, friends! Today's gonna be an amazing day :smile: \n Today you need to take care of the following:"
			}
		}
	];

	if (todaysTodos.length > 0) {
		let todos = [];
		for (const t of todaysTodos) {
			todos.push(t.done ? `:white_check_mark: ~${t.task}~` : `:white_square: ${t.task}`);
		}

		blocks.push(
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: todos.join('\n')
				}
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `If you want to mark a todo as :white_check_mark:, head over to my <slack://app?team=T01RDT7BASU&id=A01TNJG81LZ&tab=home|home tab>.`
				}
			}
		);
	} else {
		blocks = [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: "Wow, today's todolist is completely empty so far! Enjoy the day! :sunglasses:"
				}
			}
		];
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

const sendReminders = async (todos) => {
	for (const t of todos) {
		let user = t.rotate.length > 0 ? `<@${t.rotate[0]}>` : 'guys';
		let blocks = [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `Hey ${user}, just a friendly reminder, you still haven't done this:`
				}
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `:white_square: ${t.task}`
				},
				accessory: {
					type: 'button',
					text: {
						type: 'plain_text',
						text: 'Done'
					},
					value: t.id,
					action_id: 'todo-done'
				}
			}
		];

		const args = {
			channel: process.env.SLACK_CHANNEL,
			text: "There's something you need to do!",
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
	}
};

module.exports = { sendTodos };
