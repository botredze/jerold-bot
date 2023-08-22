const Products = require('../../model/Products')

const subStatus = 'canceled'
const productName = 'Trial_Fundamental_Forex'

async function trialCanceled(subscriptions) {
  const productDb = await Products.find({name: productName})

  return subscriptions.filter( (subscription) => {
    const status = subscription.status = subStatus;
    const product = subscription.product_id = productDb._id;

    return !status && !product;
  })
}

module.exports = trialCanceled