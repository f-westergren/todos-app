const section = (text) => {
	return {
		type: 'section',
		text: {
			type: 'mrkdwn',
			text
		}
	};
};

const button = (text, value, action_id, style) => {
	const button = {
		type: 'button',
		text: {
			type: 'plain_text',
			text
		},
		value,
		action_id
	};

	if (style) button['style'] = style;

	return button;
};

const option = (text, value) => {
	return {
		text: {
			type: 'plain_text',
			text
		},
		value
	};
};

module.exports = { section, button, option };
