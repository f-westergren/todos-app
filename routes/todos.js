const express = require('express');
const router = express.Router();
const fs = require('fs');
const dbFile = './data/sqlite.db';
const exists = fs.existsSync(dbFile);
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

const partialUpdate = require('../partialUpdate');

router.use(express.json());

if (!exists) {
	db.run(
		`CREATE TABLE todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT,
                user TEXT,
                task TEXT,
                recurring TEXT,
								rotate BOOLEAN DEFAULT false,
                done BOOLEAN DEFAULT false
            )`
	);
	console.log("New table 'todos' created!");
}

router.get('/', (req, res) => {
	let sql = 'SELECT * FROM todos';
	db.all(sql, (err, rows) => {
		if (err) {
			res.send(err.message);
		}
		res.send(rows);
	});
});

router.get('/:date', (req, res) => {
	let sql = `SELECT * FROM todos WHERE date = ?`;
	db.all(sql, req.params.date, (err, rows) => {
		if (err) {
			res.send(err.message);
		}
		res.send(rows);
	});
});

router.post('/', (req, res) => {
	const { date, task, user, recurring, done } = req.body;
	let sql = `INSERT INTO todos(date, task, user, recurring, done) VALUES(?, ?, ?, ?, ?)`;
	db.run(sql, [ date, task, user, recurring, done ], function(err) {
		if (err) {
			res.send(err.message);
		}
		res.send(`Added todo with id ${this.lastID}`);
	});
});

router.patch('/:col', (req, res) => {
	const { table, data, col } = req.body;
	let sql = partialUpdate(table, data, col, req.params.col);
	db.run(sql, function(err) {
		if (err) {
			res.send(err.message);
		}
		res.send(`Row(s) updated: ${this.changes}`);
	});
});

router.delete('/:id', (req, res) => {
	let sql = `DELETE FROM todos WHERE id= ?`;
	db.run(sql, req.params.id, function(err) {
		if (err) {
			res.send(err.message);
		}
		res.send(`Row(s) deleted ${this.changes}`);
	});
});

router.post('/view', (req, res) => {
	// Updates DB when totods are checked/unchecked from home tab
	// This function is necessary because checkboxes in Slack doesn't
	// notify which checkbox has been unchecked.

	// Get IDs from checked todos.
	let checkedTodos = {};
	req.body.values.forEach((t) => {
		checkedTodos[t.value] = true;
	});

	// Filter out all todos from today that aren't checked.
	let todos = req.body.todos.map((t) => t.id);
	todos = todos.filter((t) => !checkedTodos[t]);

	// Update DB to set all unchecked todos done = false.
	todos.forEach((t) => {
		db.run(`UPDATE todos SET done = false WHERE id = ${t}`, (err) => {
			if (err) res.send(err.message);
		});
	});

	// Update DB to set all chcked todos done = true.
	Object.keys(checkedTodos).forEach((t) => {
		db.run(`UPDATE todos SET done = true WHERE id = ${t}`, (err) => {
			if (err) res.send(err.message);
		});
	});
});

module.exports = router;
