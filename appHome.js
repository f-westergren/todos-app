// app.event("app_home_opened", async ({ event, client }) => {
//   try {
//     const result = await client.views.publish({
//       // Use the user ID associated with the event
//       user_id: event.user,
//       view: {
//         type: "home",
//         blocks: [
//           {
//             type: "section",
//             text: {
//               type: "mrkdwn",
//               text: "*Today's Todo List*",
//             },
//           },
//           {
//             type: "actions",
//             elements: [
//               {
//                 type: "checkboxes",
//                 options: [
//                   {
//                     text: {
//                       type: "plain_text",
//                       text: "Clean Dylan's litterbox :cat:",
//                       emoji: true,
//                     },
//                     value: "value-0",
//                   },
//                   {
//                     text: {
//                       type: "plain_text",
//                       text: "Take out the trash",
//                       emoji: true,
//                     },
//                     value: "value-1",
//                   },
//                   {
//                     text: {
//                       type: "plain_text",
//                       text: "Pay taxes",
//                       emoji: true,
//                     },
//                     value: "value-2",
//                   },
//                 ],
//                 action_id: "actionId-0",
//               },
//             ],
//           },
//           {
//             type: "actions",
//             elements: [
//               {
//                 type: "button",
//                 text: {
//                   type: "plain_text",
//                   text: "Add Todo",
//                   emoji: true,
//                 },
//                 value: "click_me_123",
//                 action_id: "add-todo",
//               },
//             ],
//           },
//           {
//             type: "actions",
//             elements: [
//               {
//                 type: "button",
//                 text: {
//                   type: "plain_text",
//                   text: "Add Reminder",
//                   emoji: true,
//                 },
//                 value: "click_me_123",
//                 action_id: "add-reminder",
//               },
//             ],
//           },
//         ],
//       },
//     });