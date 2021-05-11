const axios = require('axios');
const moment = require('moment');

const { API_URL, DB_URL, SLACK_HEADERS, DB_HEADERS } = require('./config');

const { option, section } = require('./blocks');

const addTodo = async (trigger_id, channel) => {
	const modal = {
		private_metadata: channel,
		type: 'modal',
		title: {
			type: 'plain_text',
			text: 'Add New Todo'
		},
		submit: {
			type: 'plain_text',
			text: 'Add'
		},
		close: {
			type: 'plain_text',
			text: 'Cancel'
		},
		callback_id: 'add-todo-modal',
		blocks: [
			{
				type: 'input',
				block_id: 'todo01',
				element: {
					type: 'plain_text_input',
					action_id: 'task'
				},
				label: {
					type: 'plain_text',
					text: 'What?'
				}
			},
			{
				type: 'input',
				block_id: 'todo02',
				element: {
					type: 'datepicker',
					initial_date: moment().format('YYYY-MM-DD'),
					placeholder: {
						type: 'plain_text',
						text: 'Select a date'
					},
					action_id: 'date'
				},
				label: {
					type: 'plain_text',
					text: 'When?'
				}
			},
			{
				type: 'input',
				block_id: 'todo03',
				element: {
					type: 'static_select',
					initial_option: {
						text: {
							type: 'plain_text',
							text: 'No'
						},
						value: 'no'
					},
					options: [
						option('No', 'no'),
						option('Every day', 'every-day'),
						option('Every other day', 'every-other-day'),
						option('Every week', 'every-week'),
						option('Every other week', 'every-other-week'),
						option('Every month', 'every-month'),
						option('Every other month', 'every-other-month')
					],
					action_id: 'recurring'
				},
				label: {
					type: 'plain_text',
					text: 'Recurring?'
				}
			},
			{
				type: 'input',
				block_id: 'todo04',
				optional: true,
				element: {
					type: 'multi_users_select',
					placeholder: {
						type: 'plain_text',
						text: 'Select user(s)'
					},
					action_id: 'user'
				},
				label: {
					type: 'plain_text',
					text: 'Is this todo for a certain person(s)?'
				}
			}
		]
	};

	const args = {
		trigger_id: trigger_id,
		view: JSON.stringify(modal)
	};

	try {
		const result = await axios.post(`${API_URL}/views.open`, args, SLACK_HEADERS);
		if (result.data.error) console.log(result.data.error);
	} catch (err) {
		return next(err);
	}
};

const markTodo = async (trigger_id) => {
	let todaysTodos = [];
	try {
		const result = await axios.get(`${DB_URL}/${moment().format('YYYY-MM-DD')}`, DB_HEADERS);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	let todoOptions = [];
	let initialOptions = [];
	let finishedTodos = []; // Used to pass marked todos with private_metadata
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

	if (todaysTodos.length > 0) {
		let todo = {};
		for (const t of todaysTodos) {
			todo = {
				text: {
					type: 'mrkdwn',
					text: `${t.task}`
				},
				value: t.id.toString()
			};
			todoOptions.push(todo);
			if (t.done) {
				initialOptions.push(todo);
				finishedTodos.push(t.task);
			}
		}
		if (initialOptions.length > 0) checkboxes.elements[0]['initial_options'] = initialOptions;
	}

	let view = {
		type: 'modal',
		callback_id: 'mark-done-modal',
		title: {
			type: 'plain_text',
			text: moment().format('dddd, MMMM Do')
		},
		submit: {
			type: 'plain_text',
			text: 'Done'
		},
		close: {
			type: 'plain_text',
			text: 'Cancel'
		},
		blocks: [ checkboxes ],
		private_metadata: finishedTodos.join(',') // Used to track finished todos.
	};

	const args = {
		trigger_id: trigger_id,
		view: JSON.stringify(view)
	};

	try {
		const result = await axios.post(`${API_URL}/views.open`, args, SLACK_HEADERS);
		if (result.data.error) console.log(result.data.error);
	} catch (err) {
		return next(err);
	}
};

const deleteTodo = async (trigger_id, date = moment().format('YYYY-MM-DD'), view_id) => {
	let todos = [];
	let blocks = [
		{
			dispatch_action: true,
			type: 'input',
			block_id: 'delete-todo-datepicker',
			element: {
				initial_date: date,
				type: 'datepicker',
				action_id: 'delete-todo-date'
			},
			label: {
				type: 'plain_text',
				text: 'Select a date to show todos'
			}
		},
		section(' ')
	];
	try {
		const result = await axios.get(`${DB_URL}/${date}`, DB_HEADERS);
		todos.push(...result.data);
	} catch (err) {
		console.log(err.message);
	}

	let elements = [];
	for (const t of todos) {
		elements.push({
			type: 'button',
			confirm: {
				title: {
					type: 'plain_text',
					text: 'Are you sure?'
				},
				text: {
					type: 'mrkdwn',
					text: `This will delete "${t.task}"`
				},
				confirm: {
					type: 'plain_text',
					text: 'Do it'
				},
				deny: {
					type: 'plain_text',
					text: "Stop, I've changed my mind!"
				}
			},
			style: 'danger',
			text: {
				type: 'plain_text',
				text: `${t.task}`
			},
			value: `${t.id}`,
			action_id: `delete-${t.id}`
		});
	}

	if (elements.length > 0) {
		blocks.push({ type: 'actions', block_id: date, elements });
	} else {
		blocks.push(section('No todos on this date.'));
	}

	let view = {
		type: 'modal',
		callback_id: 'mark-done-modal',
		title: {
			type: 'plain_text',
			text: 'Delete Todos'
		},
		close: {
			type: 'plain_text',
			text: 'Done'
		},
		blocks: blocks
	};

	const args = {
		trigger_id: trigger_id,
		view: JSON.stringify(view),
		view_id: view_id
	};

	const apiMethod = view_id ? 'views.update' : 'views.open';

	try {
		const result = await axios.post(`${API_URL}/${apiMethod}`, args, SLACK_HEADERS);
		if (result.data.error) console.log(result.data.error);
	} catch (err) {
		return next(err);
	}
};

module.exports = { addTodo, markTodo, deleteTodo };
