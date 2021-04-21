const axios = require('axios');
const moment = require('moment');

const apiUrl = 'https://slack.com/api';
const dbUrl = 'http://localhost:3000';

const updateView = async () => {
	let today = moment().format('YYYY-MM-DD');
	let todoOptions = [];
	let initialOptions = [];
	let noTodos = {
		type: 'section',
		text: {
			type: 'mrkdwn',
			text: `Nothing to do today!`
		}
	};
	let checkboxes = {
		type: 'actions',
		block_id: 'todos',
		elements: [
			{
				type: 'checkboxes',
				action_id: 'check',
				options: todoOptions
			}
		]
	};
	let blocks = [
		{
			type: 'section',
			block_id: 'header',
			text: {
				type: 'mrkdwn',
				text: `*Today's Todo List* - ${moment().format('dddd, MMMM Do YYYY')}`
			}
		},
		{
			type: 'actions',
			block_id: 'add-todo-button',
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
		}
	];

	let newTodos = [];

	try {
		const result = await axios.get(`${dbUrl}/todos/${today}`);
		newTodos.push(...result.data);
	} catch (error) {
		console.error(error);
	}
	if (newTodos.length > 0) {
		let todo = {};
		for (const t of newTodos) {
			todo = {
				text: {
					type: 'mrkdwn',
					text: `${t.task}`
				},
				value: t.id.toString()
			};
			todoOptions.push(todo);
			if (t.done) {
				todo.text.text = `~${t.task}~`;
				initialOptions.push(todo);
			}
		}
		if (initialOptions.length > 0) checkboxes.elements[0]['initial_options'] = initialOptions;
	}

	// Insert today's todos in blocks.
	blocks.splice(1, 0, todoOptions.length > 0 ? checkboxes : noTodos);

	let view = {
		type: 'home',
		blocks: blocks
	};

	return JSON.stringify(view);
};

const displayHome = async (user, data) => {
	if (data) {
		try {
			await axios.post(`${dbUrl}/todos`, data);
		} catch (error) {
			console.error(error);
		}
	}

	const args = {
		user_id: user,
		view: await updateView()
	};

	const config = {
		headers: {
			Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
			'Content-type': 'application/json;charset=utf8'
		}
	};

	const result = await axios.post(`${apiUrl}/views.publish`, args, config);

	try {
		if (result.data.error) {
			console.log(result.data.error);
		}
	} catch (e) {
		console.log(e);
	}
};

module.exports = { displayHome };
