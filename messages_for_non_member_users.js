require("dotenv").config();
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const Users = require("./model/Users");
const MessageSchedules = require("./model/MessageSchedules");
const input = require("input");
const fs = require("fs");
const { dbhost, dbname, dbport, options } = require("./config/db");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot("6234053676:AAFKrP_j59VbmXBn14rWZsAYPQ7Did0dAT0", { polling: true });

const init = () => {
  mongoose.connect(process.env.DB_STRING);
  // mongoose.connect(`mongodb://${dbhost}:${dbport}/${dbname}`, options);
  const db = mongoose.connection;

  db.once("error", (err) => {
    console.log("DB ERROR:", err);
  });

  db.once("open", () => {
    console.log(`Connected to DB, ${dbhost}:${dbport}`);
  });

  db.once("close", () => {
    console.log("Close DB connection....");
  });
};

init();

const apiId = 23980150;
const apiHash = "ce0fd61aab435755c5f01dcadb336745";
const sessionHash = "1AgAOMTQ5LjE1NC4xNjcuNDEBu0wcvk2582PyyH9MjxTYGLPAk6wI2FJ/XhKiAc2+5yXcE7PrzVRwTiyK0sYUTelyK+xWZsMf6PJsMMVb9fP99P8Vw/YR6eIvktqbv6P9AsAkw7Zkmi/QvvNv2S08q9JKDVLYpIe8lG+F/+L5e3xyuQbmQJ1LVh7rQYGuhY3iGNqrrz+3VbjxclVQ9Id6IDV9fP2oFhvjc9I2IZ1wS+GiBZhG8uX4bvyqBlNU+n60hyCH2yO8PDf/20kM4fYQxiva0b4Cf/kL5gFo5cfT1Yrnmi25P5iJLS4Av9uSB+4Aa2bAuyMAOTQZeudpEWFzSzuI0IZ1BylPHa1J27wCYUL2q34=";
const stringSession = new StringSession(sessionHash); // fill this later with the value from session.save()

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: false
  });

  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () => await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err)
  });
  const channelIds = await input.text("Please enter channel ID's (without sign!)");
  const messageName = await input.text("Please enter message name (event_type)");
  console.log("You should now be connected.");
  console.log("-------session---------", client.session.save()); // Save this string to avoid logging in again

  const allMembers = new Set();
  for (const item of channelIds.trim().split(" ")) {
    const result = await client.invoke(
      new Api.channels.GetParticipants({
        channel: `-100${item}`,
        filter: new Api.ChannelParticipantsRecent({ q: "" }),
        offset: 0,
        limit: 100,
        hash: BigInt(`-${item}`)
      })
    );

    result.users.forEach((user) => {
      allMembers.add(user.id.value.toString());
    });
  }
  console.log("__users_loaded__");
  const allUsers = new Set();
  const users = await Users.find({ telegramID: { $ne: null } });

  for (let user of users) {
    allUsers.add(user.telegramID);
  }

  const recipients = new Set([...allUsers].filter(member => !allMembers.has(member)));

  async function sendMessage(chatId, message) {
    try {
      // Отправляем сообщение
      await bot.sendMessage(chatId, message);
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
    }
  }

  async function sendMessagesToUsers(users, message) {
    const batchSize = 30; // Максимальное количество получателей в одном API-запросе

    const batches = [];
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      batches.push(batch);
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map((id) => sendMessage(id, message))
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const message = await MessageSchedules.findOne({ event_type: messageName });

  await sendMessagesToUsers([...recipients], message.message_body);

  console.log("Recipients: ", recipients.size);
  console.log("Users in DB: ", allUsers.size);
  console.log("Channel Members: ", allMembers.size);

  console.log(allMembers);
})();