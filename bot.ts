import config from "./env.ts";
import { about, start_msg, start_reply_markup } from "./helpers.ts";
import {
  Bot,
  GrammyError,
  HttpError,
  InlineKeyboard,
  Keyboard,
} from "grammy/mod.ts";

console.log("Initializing...");
const bot = new Bot(config.BOT_TOKEN);
console.log("Connected bot.");

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

const owners: number[] = [];
for (const owner of config.OWNERS.split(" ")) {
  owners.push(Number(owner));
}
const log_loc_msg = new Map();
const log_phn_msg = new Map();
const user_data = new Map();

bot.command("start", async (ctx) => {
  await ctx.reply(
    start_msg.replace("{name}", ctx.from!.first_name),
    { reply_markup: start_reply_markup },
  );
});

bot.callbackQuery("home", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(start_msg.replace("{name}", ctx.from?.first_name), {
    reply_markup: start_reply_markup,
  });
});

bot.callbackQuery("schedule", async (ctx) => {
  await ctx.answerCallbackQuery();
  const keyboard = new Keyboard().requestLocation("Share Location").resized();
  await ctx.deleteMessage();
  const m = await ctx.api.sendMessage(
    ctx.chat!.id,
    "Please share your pickup location using the below button.",
    {
      reply_markup: keyboard,
    },
  );
  log_loc_msg.set(ctx.chat!.id, m);
});

bot.callbackQuery("about", async (ctx) => {
  await ctx.editMessageText(about, {
    reply_markup: new InlineKeyboard().text("Home", "home"),
    parse_mode: "Markdown",
  });
});

bot.on(":location", async (ctx) => {
  await ctx.api.deleteMessage(
    ctx.chat!.id,
    log_loc_msg.get(ctx.chat!.id)!.message_id,
  );
  const waste_types = new InlineKeyboard()
    .text("Recyclable", "waste_type recyclable")
    .text("Non-Recyclable", "waste_type non-recyclable")
    .row()
    .text("Degradable", "waste_type degradable")
    .row()
    .text("All Types", "waste_type all")
    .row();
  await ctx.api.sendMessage(
    ctx.chat!.id,
    "Please select the type of waste to be collected.",
    { reply_markup: waste_types },
  );
  user_data.get(ctx.chat!.id);
  user_data.set(ctx.chat!.id, new Map().set("location", ctx));
});

bot.callbackQuery(/waste_type/, async (ctx) => {
  const waste_type = ctx.update.callback_query.data.split(" ")[1];
  await ctx.answerCallbackQuery();
  const user_d = user_data.get(ctx.chat!.id);
  const location = user_d!.get("location");
  user_data.set(
    ctx.chat!.id,
    new Map().set("location", location).set("waste_type", waste_type),
  );
  const weights = new InlineKeyboard()
    .text("Less than 2kg", "weight_Less than 2kg")
    .row()
    .text("3kg to 5kg", "weight_2kg to 5kg")
    .row()
    .text("6kg to 15kg", "weight_6kg to 15kg")
    .row()
    .text("More than 15kg", "weight_More than 15kg")
    .row();
  await ctx.editMessageText("Please select the approximate weight.", {
    reply_markup: weights,
  });
});

bot.callbackQuery(/weight_/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const weight = ctx.update.callback_query.data.split("_")[1];
  const user_d = user_data.get(ctx.chat!.id);
  const location = user_d!.get("location");
  const waste_type = user_d!.get("waste_type");
  user_data.set(
    ctx.chat!.id,
    new Map().set("location", location).set("waste_type", waste_type).set(
      "weight",
      weight,
    ),
  );
  if (!(waste_type == "recyclable" && weight != "Less than 2kg")) {
    await ctx.editMessageText(
      `Since your choices (${waste_type}, ${weight}) are not eligible for free pickup, a minimal fee of Rs.X would be charged by the pickup assistant.\nDo you want to continue?`,
      {
        reply_markup: new InlineKeyboard().text("Yes", "pickup_time").text(
          "No",
          "cancel",
        ),
      },
    );
  } else {
    await ctx.editMessageText("Please select the pickup time.", {
      reply_markup: new InlineKeyboard().text(
        "Select pickup time",
        "pickup_time",
      ),
    });
  }
});

bot.callbackQuery("cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Thanks for choosing TrashTor! Hope to see you again soon :)",
  );
});

bot.callbackQuery("pickup_time", async (ctx) => {
  const reply_markup = new InlineKeyboard()
    .text("Within 2 days", "time_Within 2 Days.")
    .text("Within a week", "time_Within a week.");
  await ctx.editMessageText(
    "Please select the pickup time from the below options.",
    { reply_markup: reply_markup },
  );
});

bot.callbackQuery(/time_/, async (ctx) => {
  const time = ctx.update.callback_query.data.split("_")[1];
  const user_d = user_data.get(ctx.chat!.id);
  const location = user_d!.get("location");
  const waste_type = user_d!.get("waste_type");
  const weight = user_d!.get("weight");
  user_data.set(
    ctx.chat!.id,
    new Map().set("location", location).set("waste_type", waste_type).set(
      "weight",
      weight,
    ).set("pickup_time", time),
  );
  await ctx.deleteMessage();
  const msg = await ctx.api.sendMessage(
    ctx.chat!.id,
    "Please provide your phone number.",
    {
      reply_markup: new Keyboard().requestContact("Share Contact").resized(),
    },
  );
  log_phn_msg.set(ctx.chat!.id, msg);
});

bot.on(":contact", async (ctx) => {
  await ctx.api.deleteMessage(
    ctx.chat!.id,
    log_phn_msg.get(ctx.chat!.id)!.message_id,
  );
  const choose_random_pickup =
    owners[Math.floor(Math.random() * owners.length)];
  const userdata = user_data.get(ctx.chat!.id);
  const loc = userdata.get("location");
  const waste_type = userdata.get("waste_type");
  const weight = userdata.get("weight");
  const time = userdata.get("pickup_time");
  const phone = ctx.update.message!.contact.phone_number;
  await ctx.deleteMessage();
  const order_data = `Order Details:
Name: ${ctx.from?.first_name}
Phone: ${phone}
Waste Type: ${waste_type}
Weight: ${weight}
PickUp Time: ${time}
Location: 👇`;
  await ctx.api.sendMessage(
    ctx.chat!.id,
    `Order generated.\nPickup Agent ID: ${choose_random_pickup}.

${order_data}
`,
  );
  await loc.copyMessage(ctx.chat!.id);
  await ctx.api.sendMessage(choose_random_pickup, `New order:\n${order_data}`);
  await loc.copyMessage(choose_random_pickup);
  await ctx.api.sendMessage(choose_random_pickup, "Do you accept the order?", {
    reply_markup: new InlineKeyboard().text(
      "Accept",
      "order_stats accept " + ctx.chat!.id,
    ).text("Reject", "order_stats reject " + ctx.chat!.id),
  });

  // log all orders
  await ctx.api.sendMessage(config.LOG_CHAT, `New order:\n${order_data}`);
  await loc.copyMessage(config.LOG_CHAT);
});

bot.callbackQuery(/order_stats/, async (ctx) => {
  await ctx.editMessageText("User has been updated with the confirmation.");
  const stats = ctx.update.callback_query.data.split(" ")[1];
  const user_id = Number(ctx.update.callback_query.data.split(" ")[2]);
  await ctx.answerCallbackQuery();
  if (stats == "accept") {
    await ctx.api.sendMessage(
      user_id,
      `Your order has been accepted by the pickup partner and would be collected within the above-said time.`,
    );
  } else {
    await ctx.api.sendMessage(
      user_id,
      `Your order has been rejected by the pickup partner. Kindly place another order.`,
    );
  }
});
await bot.init();
export default bot;
