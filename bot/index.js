require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

const Users = require("../model/Users");
const Logs = require("../model/Logs");
const ReactionHandler = require("../messsages/ReactionHandler");

const start = require("./on_text/start");
const about = require("./callback_query/about");
const back = require("./callback_query/back");
const support = require("./callback_query/support");
const manageSubscriptionMenu = require("./callback_query/manageSubscriptionMenu");
const mySubscription = require("./callback_query/mySubscription");
const product_menu = require("./callback_query/product_menu");
const create_subscription = require("./callback_query/create_subscription");
const delete_subscription = require("./callback_query/delete_sub");
const answer = require("./callback_query/delete_sub_answer");
const confirmDeleteSubscription = require("./callback_query/delete_sub_confirm");

bot.onText(/\/start/, async (msg, match) => {
  try {
    await start(msg, bot);
  } catch (error) {
    Logs.create(null, "system_error", "system", error.stack.toString(), null);
  }
});

bot.on("callback_query", async (query) => {
  try {
    const { data, message } = query;
    const { chat } = message;
    const user = await Users.findOne({ telegramID: chat.id });

    await Logs.create(
      chat.id,
      "callback_query",
      "user",
      {
        telegram_ID: chat.id,
        first_name: chat.first_name,
        username: chat.username,
        message: data,
      },
      user
    );

    if (data.includes("react.")) {
      await (new ReactionHandler()).handle(data);
      await bot.answerCallbackQuery(query.id, { text: "Спасибо за вашу реакцию" });
    }

    if (data.includes("delete_answer")) {
      await answer(chat.id, bot, data);
      return;
    }

    if (!data.includes("product")) {
      switch (data) {
        case "about":
          await about(chat.id, bot);
          break;
        case "support":
          await support(chat.id, bot);
          break;
        case "back":
          await back(chat.id, user._id, bot);
          break;
        case "manage_subscription":
          await manageSubscriptionMenu(chat.id, bot);
          break;
        case "my_subscription":
          await mySubscription(chat.id, user, bot);
          break;
        case "package_menu":
          await product_menu(chat.id, bot);
          break;
        case "back_for_pay":
          await product_menu(chat.id, bot);
          break;
        case "delete_sub_menu":
          await bot.sendMessage(
            chat.id,
            "Нам очень жаль, что ты не хочешь оставаться с нами 😥 Ты уверен что хочешь отменить подписку и не использовать Jerold?",
            confirmDeleteSubscription()
          );
          break;
        case "delete_sub":
          await delete_subscription(chat.id, bot);
          break;
      }
      return;
    }

    if (data.includes("product")) {
      if (data.includes("_delete")) {
        const product = data.slice(0, data.lastIndexOf("_"));
        await delete_subscription(chat.id, bot, product);
        return;
      }

      await create_subscription(chat.id, data, bot);
      return;
    }
  } catch (error) {
    Logs.create(null, "system_error", "system", error.stack.toString(), null);
  }
});

bot.on("message", async (msg) => {
  const { id, username, first_name } = msg.from;
  // const user = await Users.findOneAndUpdate(
  //   { telegramID: id },
  //   {
  //     username,
  //     first_name,
  //   },
  //   { new: true }
  // );

  // await Logs.create(id, "message", "user", msg, user);
});

module.exports = bot;
