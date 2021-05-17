const express = require('express');
const router = express.Router();
const fs = require('fs');

// init sqlite db
const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

const { TZ } = require("../config")

const moment = require('moment');
const cron = require('node-cron');
const today = moment.tz(TZ).format('YYYY-MM-DD')

const partialUpdate = require('../partialUpdate');
const { checkToken } = require('../middleware/auth');

router.use(express.json());

if (!exists) {
	db.run(
		`CREATE TABLE todos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT,
			user TEXT,
			task TEXT,
			recurring TEXT,
			rotate TEXT,
			done BOOLEAN DEFAULT false,
			reminder BOOLEAN DEFAULT true
		)`
	);
	console.log("New table 'todos' created!");
}

router.get('/', checkToken, (req, res) => {
	let sql = 'SELECT * FROM todos';
	db.all(sql, (err, rows) => {
		if (err) {
			res.send(err.message);
		}
		res.send(rows);
	});
});

router.get('/:date', checkToken, (req, res) => {
	let sql = `SELECT * FROM todos WHERE date = ?`;
	db.all(sql, req.params.date, (err, rows) => {
		if (err) {
			res.send(err.message);
		}
		res.send(rows);
	});
});

router.post('/', checkToken, (req, res) => {
	const { date, task, user, recurring, done, rotate, reminder } = req.body;
	let sql = `INSERT INTO todos(date, task, user, recurring, done, rotate, reminder) VALUES(?, ?, ?, ?, ?, ?, ?)`;
	db.run(sql, [ date, task, user, recurring, done, rotate ], function(err) {
		if (err) {
			res.send(err.message);
		}
		res.send(`Added todo with id ${this.lastID}`);
	});
});

router.patch('/:id', checkToken, (req, res) => {
	const { table, data } = req.body;
	let sql = partialUpdate(table, data, req.params.id);
	db.run(sql, function(err) {
		if (err) {
			res.send(err.message);
		}
		res.send(`Row(s) updated: ${this.changes}`);
	});
});

router.delete('/:id', checkToken, (req, res) => {
	let sql = `DELETE FROM todos WHERE id= ?`;
	db.run(sql, req.params.id, function(err) {
		if (err) {
			res.send(err.message);
		}
		res.send(`Row(s) deleted ${this.changes}`);
	});
});

router.post('/view', checkToken, (req, res) => {
	// Updates DB when totods are checked/unchecked from home tab
	// This function is necessary because checkboxes in Slack doesn't
	// notify which checkbox has been unchecked.

	const values = req.body.values;

	// If all todos are unchecked
	if (values.length === 0) {
		db.run(`UPDATE todos SET done = false WHERE date = "${today}"`, (err) => {
			if (err) res.send(err.message);
		});
	} else {
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
	}
	res.send('Updated todos');
});

module.exports = router;
