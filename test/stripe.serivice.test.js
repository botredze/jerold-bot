const { createSubscriptionPromo, createSubscription, createTrialSubscription, cancelSubscription } = require('../utils/stripe');
const Users = require("../model/Users");
const Products = require("../model/Products");
const Logs = require("../model/Logs");
const Subscriptions = require("../model/Subscriptions");
const crm = require("../utils/crm");
describe('createSubscriptionPromo', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test successful subscription creation with promo code
  it('should create a subscription with promo code successfully', async () => {
    // Mock the necessary data
    const customerData = {
      id: 'customer_id',
    };

    const productData = {
      id: 'product_id',
    };

    const invoiceData = {
      payment_intent: {
        id: 'payment_intent_id',
      },
    };

    Users.findOne.mockResolvedValueOnce({ email: 'test@example.com' });
    stripe.customers.search.mockResolvedValueOnce({ data: [customerData] });
    stripe.products.search.mockResolvedValueOnce({ data: [productData] });
    stripe.invoices.list.mockResolvedValueOnce({ data: [invoiceData] });
    Users.updateOne.mockResolvedValueOnce();

    // Define the expected result
    const expectedResult = 'payment_intent_id';

    // Execute the function and assert the result
    const result = await createSubscriptionPromo('John Doe', 'telegram_id', 100, 'Product Name');
    expect(result).toEqual(expectedResult);

    // Verify that the necessary methods were called with the correct arguments
    expect(Users.findOne).toHaveBeenCalledWith({ telegramID: 'telegram_id' });
    expect(stripe.customers.search).toHaveBeenCalledWith({ query: "metadata['telegram_id']:'telegram_id'" });
    expect(stripe.customers.create).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'test@example.com',
      phone: undefined, // Add the necessary phone data here if needed
      metadata: {
        telegram_id: 'telegram_id',
      },
    });
    expect(stripe.products.search).toHaveBeenCalledWith({ query: "name:'Product Name'" });
    expect(stripe.subscriptions.create).toHaveBeenCalledWith({
      customer: 'customer_id',
      items: [{ price: 'product_id' }],
      add_invoice_items: [{ price: 'product_id' }],
      payment_behavior: 'default_incomplete',
      description: 'Jerold Product Name',
      payment_settings: {
        payment_method_types: ['card'],
        payment_method_options: {
          card: {
            mandate_options: {
              description: 'Jerold Product Name',
            },
            request_three_d_secure: 'any',
          },
        },
      },
      trial_period_days: '90',
      metadata: {
        telegram_id: 'telegram_id',
      },
    });
    expect(stripe.invoices.list).toHaveBeenCalledWith({ limit: 1 });
    expect(Users.updateOne).toHaveBeenCalledWith({ telegramID: 'telegram_id' }, { used_promo_subscription: true });
  });

  // Test when a trial subscription is already active
  it('should return an error when a trial subscription is already active', async () => {
    // Mock the necessary data
    Users.findOne.mockResolvedValueOnce({ email: 'test@example.com' });
    Subscriptions.findOne.mockResolvedValueOnce({});

    // Define the expected error message
    const expectedError = {
      status: 400,
      body: {
        message: 'Trial subscription already active',
      },
    };

    // Execute the function and assert the error
    const result = await createSubscriptionPromo('John Doe', 'telegram_id', 100, 'Product Name');
    expect(result).toEqual(expectedError);

    // Verify that the necessary methods were called with the correct arguments
    expect(Users.findOne).toHaveBeenCalledWith({ telegramID: 'telegram_id' });
    expect(Subscriptions.findOne).toHaveBeenCalledWith({
      user: expect.any(Object),
      'product.is_trial': true,
      status: 'active',
    });
  });
});

describe('createSubscription', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test successful subscription creation
  it('should create a subscription successfully', async () => {
    // Mock the necessary data
    const customerData = {
      id: 'customer_id',
    };

    const productData = {
      stripe_product_id: 'stripe_product_id',
      default_price: 'default_price',
      channel_id: 'channel_id',
    };

    const subscriptionData = {
      id: 'subscription_id',
      latest_invoice: {
        id: 'invoice_id',
        payment_intent: {
          id: 'payment_intent_id',
        },
      },
    };

    const dealData = {
      id: 'deal_id',
    };

    const invoiceData = {
      id: 'invoice_id',
    };

    const paymentIntentData = {
      id: 'payment_intent_id',
    };

    Users.findOne.mockResolvedValueOnce({});
    stripe.customers.retrieve.mockResolvedValueOnce(customerData);
    stripe.products.retrieve.mockResolvedValueOnce(productData);
    stripe.subscriptions.create.mockResolvedValueOnce(subscriptionData);
    crm.createDealFromFront.mockResolvedValueOnce(dealData);
    stripe.invoices.retrieve.mockResolvedValueOnce(invoiceData);
    stripe.paymentIntents.retrieve.mockResolvedValueOnce(paymentIntentData);
    Subscriptions.createSubWithPayment.mockResolvedValueOnce({});

    // Execute the function and assert the result
    const result = await createSubscription('John Doe', 'telegram_id', 'package_id');
    expect(result).toEqual(paymentIntentData);

    // Verify that the necessary methods were called with the correct arguments
    expect(Users.findOne).toHaveBeenCalledWith({ telegramID: 'telegram_id' });
    expect(stripe.customers.retrieve).toHaveBeenCalledWith('stripe_customer_id');
    expect(stripe.products.retrieve).toHaveBeenCalledWith('package_id');
    expect(stripe.subscriptions.create).toHaveBeenCalledWith({
      customer: 'customer_id',
      items: [{ price: 'default_price' }],
      payment_behavior: 'default_incomplete',
      description: 'Jerold Product Name',
      payment_settings: {
        payment_method_types: ['card'],
        payment_method_options: {
          card: {
            mandate_options: {
              description: 'Jerold Product Name',
            },
            request_three_d_secure: 'any',
          },
        },
      },
      expand: ['latest_invoice.payment_intent'],
    });
    expect(crm.createDealFromFront).toHaveBeenCalledWith(
      undefined,
      'Stripe',
      undefined,
      undefined,
      undefined,
      productData,
      null
    );
    expect(stripe.invoices.retrieve).toHaveBeenCalledWith('invoice_id');
    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('payment_intent_id');
    expect(Subscriptions.createSubWithPayment).toHaveBeenCalledWith(
      undefined,
      dealData.id,
      'package_id',
      'subscription_id',
      'inactive',
      {
        user: expect.any(Object),
        product: 'package_id',
        amount: expect.anything(),
        currency: 'usd',
        crm_deal_id: dealData.id,
        payment_method: 'stripe',
        status: 'created',
        channel_id: 'channel_id',
        payment_id: 'invoice_id',
        order_id: 'null',
      }
    );
  });

  // Test when the product subscription has expired
  it('should return an error when the product subscription has expired', async () => {
    // Mock the necessary data
    const productData = {
      end_date: new Date('2022-01-01'),
    };

    Products.findOne.mockResolvedValueOnce(productData);

    // Define the expected error message
    const expectedError = {
      status: 400,
      body: {
        message: 'Product subscription expired',
      },
    };

    // Execute the function and assert the error
    const result = await createSubscription('John Doe', 'telegram_id', 'package_id');
    expect(result).toEqual(expectedError);

    // Verify that the necessary methods were called with the correct arguments
    expect(Products.findOne).toHaveBeenCalledWith({ _id: 'package_id' });
  });

  // Test when the user has an active trial subscription
  it('should return an error when the user has an active trial subscription', async () => {
    // Mock the necessary data
    const userData = {
      _id: 'user_id',
    };

    const hasTrialSubscriptionData = {
      user: 'user_id',
      product: {
        is_trial: true,
      },
      status: 'active',
    };

    Users.findOne.mockResolvedValueOnce(userData);
    Subscriptions.findOne.mockResolvedValueOnce(hasTrialSubscriptionData);

    // Define the expected error message
    const expectedError = {
      status: 400,
      body: {
        message: 'Trial subscription already active',
      },
    };

    // Execute the function and assert the error
    const result = await createSubscription('John Doe', 'telegram_id', 'package_id');
    expect(result).toEqual(expectedError);

    // Verify that the necessary methods were called with the correct arguments
    expect(Users.findOne).toHaveBeenCalledWith({ telegramID: 'telegram_id' });
    expect(Subscriptions.findOne).toHaveBeenCalledWith({
      user: 'user_id',
      product: 'package_id',
      status: 'active',
    });
  });
});

describe('createTrialSubscription', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test successful trial subscription creation
  it('should create a trial subscription successfully', async () => {
    // Mock the necessary data
    const user = {
      _id: 'user_id',
      stripe_customer_id: 'stripe_customer_id',
    };

    const product = {
      _id: 'product_id',
      stripe_price_id: 'stripe_price_id',
      price: 10,
      currency: 'usd',
    };

    const trialSubscription = {
      _id: 'subscription_id',
      save: jest.fn(),
      stripe_subscription_id: null,
    };

    const stripeSubscription = {
      id: 'stripe_subscription_id',
    };

    const log = {
      save: jest.fn(),
    };

    Users.findById.mockResolvedValueOnce(user);
    Products.findById.mockResolvedValueOnce(product);
    Subscriptions.mockReturnValueOnce(trialSubscription);
    trialSubscription.save.mockResolvedValueOnce();
    Logs.mockReturnValueOnce(log);
    stripe.subscriptions.create.mockResolvedValueOnce(stripeSubscription);

    // Execute the function
    await createTrialSubscription('user_id', 'product_id');

    expect(Users.findById).toHaveBeenCalledWith('user_id');
    expect(Products.findById).toHaveBeenCalledWith('product_id');
    expect(Subscriptions).toHaveBeenCalledWith({
      user: 'user_id',
      product: 'product_id',
      status: 'active',
      current_period_start: expect.any(Date),
      current_period_end: expect.any(Date),
      trialStart: expect.any(Date),
      trialEnd: expect.any(Date),
    });
    expect(trialSubscription.save).toHaveBeenCalled();
    expect(Logs).toHaveBeenCalledWith({
      user: 'user_id',
      product: 'product_id',
      amount: 10,
      currency: 'usd',
      status: 'created',
      metadata: [
        { key: 'subscription_id', value: 'subscription_id' },
        { key: 'user_email', value: undefined },
      ],
    });
    expect(log.save).toHaveBeenCalled();
    expect(stripe.subscriptions.create).toHaveBeenCalledWith({
      customer: 'stripe_customer_id',
      items: [{ price: 'stripe_price_id' }],
      trial_period_days: 7,
    });
    expect(trialSubscription.stripe_subscription_id).toBe('stripe_subscription_id');

    expect(console.log).toHaveBeenCalledWith('Trial subscription created successfully.');
  });

  it('should handle errors in trial subscription creation', async () => {
    // Mock the necessary data
    const user = {
      _id: 'user_id',
      stripe_customer_id: 'stripe_customer_id',
      email: 'test@example.com',
    };

    const product = {
      _id: 'product_id',
      stripe_price_id: 'stripe_price_id',
      price: 10,
      currency: 'usd',
    };

    const trialSubscription = {
      _id: 'subscription_id',
      save: jest.fn(),
      stripe_subscription_id: null,
    };

    const error = new Error('Test error');
    const errorLog = {
      save: jest.fn(),
    };

    Users.findById.mockResolvedValueOnce(user);
    Products.findById.mockResolvedValueOnce(product);
    Subscriptions.mockReturnValueOnce(trialSubscription);
    trialSubscription.save.mockRejectedValueOnce(error);
    Logs.mockReturnValueOnce(errorLog);

    await createTrialSubscription('user_id', 'product_id');

    expect(Users.findById).toHaveBeenCalledWith('user_id');
    expect(Products.findById).toHaveBeenCalledWith('product_id');
    expect(Subscriptions).toHaveBeenCalledWith({
      user: 'user_id',
      product: 'product_id',
      status: 'active',
      current_period_start: expect.any(Date),
      current_period_end: expect.any(Date),
      trialStart: expect.any(Date),
      trialEnd: expect.any(Date),
    });
    expect(trialSubscription.save).toHaveBeenCalled();
    expect(Logs).toHaveBeenCalledWith({
      user: 'user_id',
      product: 'product_id',
      amount: 0,
      currency: '',
      status: 'error',
      metadata: [
        { key: 'error_message', value: 'Test error' },
        { key: 'user_email', value: 'test@example.com' },
      ],
    });
    expect(errorLog.save).toHaveBeenCalled();

    expect(console.error).toHaveBeenCalledWith('Error creating trial subscription:', error);
  });
});

describe('cancelSubscription', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should cancel a subscription successfully', async () => {
    // Mock the necessary data
    const user = {
      _id: 'user_id',
      telegramID: 'telegram_id',
    };

    const subscription = {
      _id: 'subscription_id',
      auto_renewal: true,
      grace_period_days: 7,
      next_renewal_date: null,
      current_period_end: new Date('2022-01-01'),
    };

    const deletedSubscription = {
      id: 'deleted_subscription_id',
    };

    const log = {
      save: jest.fn(),
    };

    stripe.subscriptions.del.mockResolvedValueOnce(deletedSubscription);
    Subscriptions.findOne.mockResolvedValueOnce(subscription);
    Subscriptions.updateOne.mockResolvedValueOnce();
    Logs.mockReturnValueOnce(log);

    const result = await cancelSubscription('subscription_id', user);

    expect(result).toBe(deletedSubscription);

    expect(stripe.subscriptions.del).toHaveBeenCalledWith('subscription_id');
    expect(Subscriptions.findOne).toHaveBeenCalledWith({ subscription_id_service: 'subscription_id' });
    expect(Subscriptions.updateOne).toHaveBeenCalledWith(
      { subscription_id_service: 'subscription_id' },
      {
        status: 'canceled',
        who_canceled: 'user',
        canceled_at: expect.any(Date),
        date_delete_user: subscription.current_period_end,
      }
    );
    expect(Logs).toHaveBeenCalledWith({
      user: 'user_id',
      product: subscription.product,
      status: 'canceled_auto_renewal',
      metadata: [
        { key: 'subscription_id', value: 'subscription_id' },
      ],
    });
    expect(log.save).toHaveBeenCalled();

    expect(console.log).toHaveBeenCalledWith('Cancel Subscription', 'subscription_id', 'telegram_id');
  });

  it('should handle errors in subscription cancellation', async () => {
    // Mock the necessary data
    const user = {
      _id: 'user_id',
      telegramID: 'telegram_id',
    };

    const error = new Error('Test error');

    stripe.subscriptions.del.mockRejectedValueOnce(error);

    const result = await cancelSubscription('subscription_id', user);

    expect(result).toBeNull();

    expect(stripe.subscriptions.del).toHaveBeenCalledWith('subscription_id');

    expect(console.log).toHaveBeenCalledWith(error);
  });
});

