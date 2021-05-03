const axios = require('axios');
const moment = require('moment');

const apiUrl = 'https://slack.com/api';
const dbUrl = process.env.DB_URL || 'http://localhost:3000/todos';

const config = {
    headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-type': 'application/json;charset=utf8'
    }
};

const addTodoBtn = {
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
        }
    ]
};

const sendTodos = async (channel) => {
    let todaysTodos = [];

    try {
        const result = await axios.get(
            `${dbUrl}/todos/${moment().format('YYYY-MM-DD')}`
        );
        todaysTodos.push(...result.data);
    } catch (err) {
        console.error(err);
    }

    let blocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text:
                    "Good morning, friends! Today's gonna be an amazing day :smile: \n Today you need to take care of the following:"
            }
        }
    ];

    if (todaysTodos.length > 0) {
        let todos = [];
        for (const t of todaysTodos) {
            todos.push(
                t.done
                    ? `:white_check_mark: ~${t.task}~`
                    : `:white_square: ${t.task}`
            );
        }

        blocks.push(
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: todos.join('\n')
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `If you want to mark a todo as :white_check_mark:, 
            head over to my <slack://app?team=T01RDT7BASU&id=A01TNJG81LZ&tab=home|home tab>.`
                }
            }
        );
    } else {
        blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text:
                        "Wow, today's todo list is completely empty so far! Enjoy the day! :sunglasses:"
                }
            }
        ];
    }

    blocks.push(addTodoBtn);

    const args = {
        text: "Check out today's todo list!",
        channel: channel,
        blocks
    };
    const result = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

    try {
        if (result.data.error) {
            console.log(result.data.error);
        }
    } catch (err) {
        console.log(err);
    }
};

const sendReminders = async () => {
    let todaysTodos = [];
    try {
        const result = await axios.get(
            `${dbUrl}/todos/${moment().format('YYYY-MM-DD')}`
        );
        todaysTodos.push(...result.data);
    } catch (err) {
        console.error(err);
    }

    // Filter out todos that are marked as done or where reminders are turned off.
    todaysTodos = todaysTodos.filter((t) => !t.done && t.reminder);

    for (const t of todaysTodos) {
        let user = t.rotate ? `<@${t.rotate[0]}>` : 'guys';
        let blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `Hey ${user}, just a friendly reminder, you still haven't done this:`
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:white_square: ${t.task}`
                }
            },
            {
                'type': 'actions',
                'elements': [
                    {
                        'type': 'button',
                        'style': 'primary',
                        'text': {
                            'type': 'plain_text',
                            'text': 'Mark as done'
                        },
                        'value': `${t.id}`,
                        'action_id': 'mark-done'
                    },
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Stop reminding me'
                        },
                        value: `${t.id}`,
                        action_id: 'stop-reminder'
                    }
                ]
            }
        ];

        const args = {
            channel: process.env.SLACK_CHANNEL,
            text: "There's something you need to do!",
            blocks: JSON.stringify(blocks)
        };

        const result = await axios.post(
            `${apiUrl}/chat.postMessage`,
            args,
            config
        );

        try {
            if (result.data.error) {
                console.log(result.data.error);
            }
        } catch (err) {
            console.log(err);
        }
    }
};

const endOfDay = async () => {
    let todaysTodos = [];

    const addTime = (num, time) => {
        let today = moment();
        today = moment(today, 'YYYY-MM-DD').add(num, time);

        return (today = today.format('YYYY-MM-DD'));
    };

    try {
        const result = await axios.get(
            `${dbUrl}/${moment().format('YYYY-MM-DD')}`
        );
        todaysTodos.push(...result.data);
    } catch (err) {
        console.error(err);
    }

    for (const t of todaysTodos) {
        if (t.recurring === 'every-day') t.date = addTime(1, 'days');
        else if (t.recurring === 'every-other-day') t.date = addTime(2, 'days');
        else if (t.recurring === 'every-week') t.date = addTime(1, 'weeks');
        else if (t.recurring === 'every-other-week')
            t.date = addTime(2, 'weeks');
        else if (t.recurring === 'every-month') t.date = addTime(1, 'months');
        else if (t.recurring === 'every-other-month')
            t.date = addTime(2, 'months');

        await axios.post(dbUrl, t);
    }

    todaysTodos = todaysTodos.filter((t) => !t.done);

    let blocks = [];

    if (todaysTodos.length > 0) {
        blocks = [
            {
                'type': 'section',
                'text': {
                    'type': 'plain_text',
                    'text':
                        "Hopefully you're sleeping now. Just FYI though, there were a few things that didn't get done today: ",
                    'emoji': true
                }
            }
        ];
        let todos = [];
        for (const t of todaysTodos) {
            todos.push(`:x: ${t.task}`);
        }
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: todos.join('\n')
            }
        });
    }

    const args = {
        channel: process.env.SLACK_CHANNEL,
        text: 'End of day report',
        blocks: JSON.stringify(blocks)
    };

    const result = await axios.post(`${apiUrl}/chat.postMessage`, args, config);

    try {
        if (result.data.error) {
            console.log(result.data.error);
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = { sendTodos, sendReminders, endOfDay };
