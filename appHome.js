const axios = require('axios');
const moment = require('moment');

const apiUrl = 'https://slack.com/api';
const dbUrl = process.env.DB_URL || 'http://localhost:3000';

const config = {
    headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-type': 'application/json;charset=utf8'
    }
};

const buttons = {
    type: 'actions',
    block_id: 'add-todo',
    elements: [
        {
            type: 'button',
            text: {
                type: 'plain_text',
                text: 'Add Todo'
            },
            value: 'add-todo',
            action_id: 'add-todo'
        },
        {
            type: 'button',
            text: {
                type: 'plain_text',
                text: 'Mark Todo as Done'
            },
            value: 'mark-todo',
            action_id: 'mark-todo'
        }
    ]
};

const updateTodoBlocks = async () => {
    let todaysTodos = [];
    let blocks = [
        {
            type: 'section',
            block_id: 'header',
            text: {
                type: 'mrkdwn',
                text: `*Today's Todo List* - ${moment().format(
                    'dddd, MMMM Do YYYY'
                )}`
            }
        }
    ];

    try {
        const result = await axios.get(
            `${dbUrl}/todos/${moment().format('YYYY-MM-DD')}`
        );
        todaysTodos.push(...result.data);
    } catch (err) {
        return next(err);
    }

    if (todaysTodos.length > 0) {
        for (const t of todaysTodos) {
            blocks.push(
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: t.done
                            ? `:white_check_mark: ~${t.task}~`
                            : `:white_square: ${t.task}`
                    }
                },
                {
                    type: 'divider'
                }
            );
        }
    } else {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `Nothing to do today!`
            }
        });
    }
    blocks.push(buttons);

    return JSON.stringify(blocks);
};

const displayHome = async (user, data) => {
    if (data) {
        try {
            await axios.post(`${dbUrl}/todos`, data);
        } catch (error) {
            return next(err);
        }
    }

    const args = {
        user_id: user,
        view: {
            type: 'home',
            blocks: await updateTodoBlocks()
        }
    };

    const result = await axios.post(`${apiUrl}/views.publish`, args, config);

    try {
        if (result.data.error) {
            console.log('ERRORS', result.data.error);
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = { displayHome };
