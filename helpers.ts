import { InlineKeyboard } from "grammy/mod.ts";

export const start_msg = `
Hello {name}!
I'm TrashTor, a bot which would help you get rid of your trash.

Click the below buttons to schedule your pickup!
`;
export const start_reply_markup = new InlineKeyboard()
  .text("Schedule Now", "schedule")
  .row()
  .text("About", "about");

export const about = `
*@TrashTorBot*

- We get rid of trash to provide a better world for the future generation.
- We:
  - recycle your recyclable trash. 
  - collect non recyclable and degradable trash.

*Note*
  - There would be charges if the wastes are not recyclable and more than 2kg.
`;
