const { DB_TOKEN } = require('../config');

function checkToken(req, res, next) {
	const token = req.headers.authorization;
	try {
		if (token && token === `Bearer ${DB_TOKEN}`) {
			return next();
		} else {
			return next({ status: 401, message: 'Unauthorized' });
		}
	} catch (err) {
		return next(err);
	}
}

module.exports = { checkToken };
