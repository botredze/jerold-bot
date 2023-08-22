const Product  = require('../../model/Products')

const productName = 'Fundamental Forex Promo';
const  subStatus = 'active';
async function promoSuccess(subscriptions) {
  const productByDB = await Product.find({name: productName})

  return subscriptions.filter(subscription => {
    const status = subscription.status = subStatus;
    const product = subscription.product_id = productByDB._id;

    return !status && !product;
  });
}

module.exports = promoSuccess;