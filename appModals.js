const axios = require('axios');
const moment = require('moment');
const apiUrl = 'https://slack.com/api';
const dbUrl = process.env.DB_URL || 'http://localhost:3000';

const config = {
	headers: {
		Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
		'Content-type': 'application/json;charset=utf8'
	}
};

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
						{
							text: {
								type: 'plain_text',
								text: 'No'
							},
							value: 'no'
						},
						{
							text: {
								type: 'plain_text',
								text: 'Every day'
							},
							value: 'every-day'
						},
						{
							text: {
								type: 'plain_text',
								text: 'Every other day'
							},
							value: 'every-other-day'
						},
						{
							text: {
								type: 'plain_text',
								text: 'Every week'
							},
							value: 'every-week'
						},
						{
							text: {
								type: 'plain_text',
								text: 'Every other week'
							},
							value: 'every-other-week'
						},
						{
							text: {
								type: 'plain_text',
								text: 'Every month'
							},
							value: 'every-month'
						},
						{
							text: {
								type: 'plain_text',
								text: 'Every other month'
							},
							value: 'every-other-month'
						}
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

	const result = await axios.post(`${apiUrl}/views.open`, args, config);

	try {
		if (result.data.error) {
			console.log(result.data.error);
		}
	} catch (err) {
		console.log(err);
	}
};

const markTodo = async (trigger_id) => {
	let todaysTodos = [];
	try {
		const result = await axios.get(`${dbUrl}/todos/${moment().format('YYYY-MM-DD')}`);
		todaysTodos.push(...result.data);
	} catch (err) {
		console.log(err);
	}

	let todoOptions = [];
	let initialOptions = [];
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
		blocks: [ checkboxes ]
	};

	const args = {
		trigger_id: trigger_id,
		view: JSON.stringify(view)
	};

	console.log(args);

	const result = await axios.post(`${apiUrl}/views.open`, args, config);

	try {
		if (result.data.error) {
			console.log(result.data.error);
		}
	} catch (err) {
		return next(err);
	}
};

module.exports = { addTodo, markTodo };
