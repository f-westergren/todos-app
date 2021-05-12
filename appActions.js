const axios = require('axios');
const { DB_URL, DB_HEADERS } = require('./config');

const updateTodo = async (id, row) => {
	const data = {
		table: 'todos',
		data: row
	};

	try {
		await axios.patch(`${DB_URL}/${id}`, data, DB_HEADERS);
	} catch (err) {
		console.log(err.message);
	}
};

module.exports = { updateTodo };
