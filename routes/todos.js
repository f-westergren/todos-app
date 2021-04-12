const express = require('express');
const router = express.Router();
const dbFile = "./data/sqlite.db";
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

const createDb = require('../db')

createDb()

router.get('/', (req, res) => {
    let sql = "SELECT * FROM todos";

    db.all(sql, (err, rows) => {
        if (err) {
            throw err
        }
        res.send(rows);
    });
})

router.get('/:date', (req, res) => {
    let sql = `SELECT * FROM todos WHERE date = ?`
    db.all(sql, req.params.date, (err, rows) => {
        if (err) {
            throw err
        }
        res.send(rows)
    })
})

router.post('/', (req, res) => {
    const { date, user, task, recurring, done } = req.body
    let sql = `INSERT INTO todos(date, user, task, recurring, done) VALUES(?, ?, ?, ?, ?)`

    db.run(sql, [date, user, task, recurring, done], function(err) {
        if (err) {
          throw err
        }
        res.send('Added todo!')
    })
})

router.delete('/:id', (req, res) => {

})

module.exports = router