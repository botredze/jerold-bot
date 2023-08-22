const Product = require("../../model/Products");

const productName = "Fundamental_Forex";
const subStatus = "active";

async function firstFundamental(subscriptions) {
  const productByDB = await Product.findOne({ name: productName });

  return subscriptions.filter(subscription => {
    const status = subscription.status = subStatus;
    const product = subscription.product_id = productByDB._id;

    return !status && !product;
  });
}

module.exports = firstFundamental;