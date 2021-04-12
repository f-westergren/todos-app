// init sqlite db
const dbFile = "./data/sqlite.db";
const fs = require("fs");
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

const createDb = () => {
    db.serialize(() => {
        if (!exists) {
          db.run(
            `CREATE TABLE todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date INTEGER,
                user TEXT,
                task TEXT,
                recurring TEXT DEFAULT 'false',
                done BOOLEAN DEFAULT false
            )`
        );
            console.log("New table 'todos' created!"); 
        } else {
            console.log('Database ready to go!');
        }
    });
}


module.exports = createDb;