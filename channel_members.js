const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const fs = require('fs');

const apiId = 23980150;
const apiHash = "ce0fd61aab435755c5f01dcadb336745";
const stringSession = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBu05RYkGtvwi7TF/+tE7ifBXdeMhEoNhVDdzfyqPABq7KrYEDiyVyRoYXnxuuNMVY0OgrwCUTYm2efgDbA3KFoaGpXaVjmds/t6gJ9sQclMdp6caAi1HtQE0MY0VlyCf8l14bP2HYct9+p18OFbqje4kCpS6ZTs0i+rACsHvqnvPpMQtjZ2C6BWULvcATUBop0ZJhgszlQyniQNxxELbKv9G0MTVXiByn8EGlnXSWRGhQzvLWdGnXoAo7huPjCPF6sbPLW4JlyG+ufNed9grLLGZNRTWNreZRI4C/S2UPLX8TtQao0oXw2CZrvTXlqh+9KMzKB5d/1kxXUqahS21v8ls="); // fill this later with the value from session.save()

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  const channelId = await input.text("Please enter channel ID (without sign!)")
  console.log("You should now be connected.");
  console.log(client.session.save()); // Save this string to avoid logging in again
  await client.sendMessage("me", { message: "Hello!" });
  const result = await client.invoke(
    new Api.channels.GetParticipants({
      channel: `-100${channelId}`,
      filter: new Api.ChannelParticipantsKicked({q: ""}),
      offset: 0,
      limit: 100,
      hash: BigInt(`-${channelId}`),
    })
  );
  console.log(typeof result);
  console.log(result);
  fs.writeFile("members.json", JSON.stringify(result), (err) => {
    if (err) {
      console.log(err)
    }
    console.log("List saved to members.json")
  });
  console.log(result);
})();