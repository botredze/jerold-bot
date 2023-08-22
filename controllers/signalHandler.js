const canvas = require("../utils/canvas");
const Products = require("../model/Products");
const bot = require("../bot");

const signalHandler = async (request, response) => {
  const list = request.body;
  const failed = [];
  await Promise.all(
    list.map(async signal => {
      let products = await Products.find({ market: signal.market, kind: signal.kind });

      if (products) {
        const responseImage = canvas.generateImageFromJson(signal);
        try {
          await Promise.all(products.map(async product => {
            await bot.sendPhoto(product.channel_id, responseImage);
          }));
        } catch (err) {
          failed.push(signal);
        }
      }
    })
  );
  response.status(200).json(failed);
};

module.exports = {
  signalHandler
};