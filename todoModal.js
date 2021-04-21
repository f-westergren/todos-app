const axios = require('axios');
const apiUrl = 'https://slack.com/api';

const openModal = async (trigger_id) => {
	const modal = {
		type: 'modal',
		title: {
			type: 'plain_text',
			text: 'Add a new todo'
		},
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

	const config = {
		headers: {
			Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
			'Content-type': 'application/json;charset=utf8'
		}
	};

	const result = await axios.post(`${apiUrl}/views.open`, args, config);

	//console.log(result.data);
};

module.exports = { openModal };
