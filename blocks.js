const section = (text, block_id) => {
	const section = {
		type: 'section',
		text: {
			type: 'mrkdwn',
			text
		}
	};

	if (block_id) section['block_id'] = block_id;
	return section;
};

const button = (text, value, action_id, style) => {
	const button = {
		type: 'button',
		text: {
			type: 'plain_text',
			text
		},
		value: `${value}`,
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
