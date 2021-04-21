const sqlForPartialUpdate = (table, data, key, row) => {
	let columns = [];
	for (let col of Object.keys(data)) {
		if (typeof data[col] == 'string') {
			columns.push(`${col} = "${data[col]}"`);
		} else {
			columns.push(`${col} = ${data[col]}`);
		}
	}

	let query = `UPDATE ${table} SET ${columns.join(', ')} WHERE ${key} = "${row}"`;

	return query;
};

module.exports = sqlForPartialUpdate;
