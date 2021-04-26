require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');

app.use(morgan('tiny'));

const todoRoutes = require('./routes/todos');
const slackRoutes = require('./routes/slack');

app.use('/todos', todoRoutes);
app.use('/slack', slackRoutes);

app.use((err, req, res, next) => {
	if (err.stack) console.log(err.stack);

	res.status(err.status || 500);

	return res.json({
		error: err,
		message: err.message
	});
});

app.listen(3000, () => {
	console.log(`Server is starting on 3000`);
});
