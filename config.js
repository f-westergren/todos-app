const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_ID = process.env.SLACK_APP_ID;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;
const SLACK_TEAM_ID = process.env.SLACK_TEAM_ID;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const DB_TOKEN = process.env.DB_TOKEN;
const DB_URL = process.env.DB_URL || 'http://localhost:3000/todos';
const API_URL = 'https://slack.com/api';

const SLACK_HEADERS = {
	headers: {
		Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
		'Content-type': 'application/json;charset=utf8'
	}
};

const DB_HEADERS = {
	headers: {
		Authorization: `Bearer ${DB_TOKEN}`
	}
};

const TZ = 'America/Toronto'

module.exports = {
	SLACK_BOT_TOKEN,
	SLACK_APP_ID,
	SLACK_CHANNEL,
	SLACK_TEAM_ID,
	SLACK_SIGNING_SECRET,
	DB_TOKEN,
	SLACK_HEADERS,
	DB_HEADERS,
	DB_URL,
	API_URL,
  TZ
};
