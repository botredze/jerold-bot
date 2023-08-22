const Users = require("../model/Users");
const Products = require("../model/Products");
const Subscriptions = require("../model/Subscriptions");
const Payments = require("../model/Payments");
const RefferalLinks = require("../model/Referral_links");
const Logs = require("../model/Logs");

const {
  updateDealAfterPayment,
  searchPerson,
  createDealFromFront,
} = require("../utils/crm");

const axios = require('axios');
const crypto = require('crypto');

const {
  succeeded,
  createPayment,
  renewal,
  failed
} = require("../services/tinkoff");

jest.mock('axios');
jest.mock('crypto');

describe("succeeded", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process a successful payment", async () => {
    // Mock the necessary data
    const body = {
      PaymentId: "payment_id",
      RebillId: "rebill_id",
    };

    const payment = {
      _id: "payment_id",
      user: {
        _id: "user_id",
        telegramID: "telegram_id",
      },
      product: {},
      subscription: {},
      crm_deal_id: "crm_deal_id",
    };

    const user = payment.user;
    const date = new Date();
    date.setDate(date.getDate() + payment.product.duration);

    const updatedUser = {
      _id: "user_id",
      banned: true,
      telegramID: "telegram_id",
    };

    const keyboardForChat = {
      reply_markup: {
        resize_keyboard: true,
        inline_keyboard: [
          [
            {
              text: `Основное меню`,
              callback_data: "back",
            },
          ],
        ],
      },
    };

    const mockLogsCreate = Logs.create.mockResolvedValue();
    const mockPaymentsFindOne = Payments.findOne.mockResolvedValue(payment);
    const mockSubscriptionsFindOne = Subscriptions.findOne.mockResolvedValue();
    const mockSubscriptionsUpdateOne = Subscriptions.updateOne.mockResolvedValue();
    const mockUpdateDealAfterPayment = updateDealAfterPayment.mockResolvedValue();
    const mockUsersFindOneAndUpdate = Users.findOneAndUpdate.mockResolvedValue(updatedUser);
    const mockBotSendMessage = bot.sendMessage.mockResolvedValue();

    // Execute the function
    await succeeded(body);

    // Verify that the necessary methods were called with the correct arguments
    expect(mockPaymentsFindOne).toHaveBeenCalledWith({ payment_id: "payment_id" });
    expect(mockSubscriptionsFindOne).toHaveBeenCalledWith({ _id: payment.subscription._id });
    expect(mockSubscriptionsUpdateOne).toHaveBeenCalledWith(
      { _id: payment.subscription._id },
      {
        status: "active",
        started_at: expect.any(Date),
        current_period_start: expect.any(Date),
        current_period_end: expect.any(Date),
        rebill_id: "rebill_id",
      }
    );
    expect(mockUpdateDealAfterPayment).toHaveBeenCalledWith(
      "crm_deal_id",
      { amount_paid: body.Amount, currency: "rub" },
      payment.subscription._id
    );
    expect(mockUsersFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: user._id },
      {
        date_delete_user: null,
        channel_id: payment.product.channel_id,
        send_failed_payment: false,
        referral_program: "true",
        subscription_id: payment.subscription._id,
        payment_method: "tinkoff",
      },
      { new: true }
    );
    expect(mockBotSendMessage).toHaveBeenCalledWith(
      user.telegramID,
      "Оплата прошла успешно 🎉!\nКанал undefined теперь доступен в основном меню",
      keyboardForChat
    );

    // Verify that the necessary logs were created
    expect(mockLogsCreate).toHaveBeenCalledWith(
      null,
      "payment_info",
      "tinkoff_payment",
      body,
      user,
      "payment succeeded"
    );
  });

  it("should log an error if an exception occurs", async () => {
    // Mock the necessary data
    const body = {
      PaymentId: "payment_id",
      RebillId: "rebill_id",
    };

    const payment = {
      _id: "payment_id",
      user: {},
      product: {},
      subscription: {},
      crm_deal_id: "crm_deal_id",
    };

    const error = new Error("Test error");

    const mockLogsCreate = Logs.create.mockRejectedValue(error);
    const mockPaymentsFindOne = Payments.findOne.mockResolvedValue(payment);

    // Execute the function
    await succeeded(body);

    // Verify that the necessary methods were called with the correct arguments
    expect(mockPaymentsFindOne).toHaveBeenCalledWith({ payment_id: "payment_id" });

    // Verify that the error was logged
    expect(mockLogsCreate).toHaveBeenCalledWith(null, "system_error", "system", error.stack.toString(), null);
  });
});

describe("createPayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a payment and return the necessary data", async () => {
    // Mock the necessary data
    const body = {
      name: "John Doe",
      phone: "1234567890",
      email: "john@example.com",
      product_name: "Product Name",
      newspaper: "Newspaper",
      subscription_type: "trial",
      ref: "referral_link",
      utm: "utm_parameters",
    };

    const currencyLink = "https://api.tinkoff.ru/v1/currency_rates?from=USD&to=RUB";

    const rates = [
      {
        category: "DebitCardsTransfers",
        sell: 70,
      },
    ];

    const product = {
      name: "Product Name",
      trial_price: 10,
      price: 20,
      promo_price: 30,
      duration: 30,
      channel_id: "channel_id",
    };

    const person = {
      id: "person_id",
    };

    const deal = {
      id: "deal_id",
    };

    const user = {
      _id: "user_id",
      telegramID: "telegram_id",
      email: "john@example.com",
      phone: "1234567890",
    };

    const subscription = {
      _id: "subscription_id",
    };

    const paymentData = {
      user: user._id,
      product: product._id,
      amount: 1000,
      currency: "rub",
      crm_deal_id: deal.id,
      payment_method: "tinkoff",
      status: "created",
      channel_id: product.channel_id,
      payment_id: "payment_id",
      order_id: "order_id",
      exchange_rate: 85,
      main_payment: true,
    };

    const paymentResult = {
      status: 200,
      body: {
        deal_id: deal.id,
        payment_url: "https://payment.url",
      },
    };

    const mockLogsCreate = Logs.create.mockResolvedValue();
    const mockAxiosGet = axios.get.mockResolvedValue({ data: { payload: { rates } } });
    const mockProductsFindOne = Products.findOne.mockResolvedValue(product);
    const mockSubscriptionsFindOne = Subscriptions.findOne.mockResolvedValue();
    const mockSubscriptionsCreateSubWithPayment = Subscriptions.createSubWithPayment.mockResolvedValue(subscription);
    const mockCrmSearchPerson = crm.searchPerson.mockResolvedValue(person);
    const mockCrmCreateDealFromFront = crm.createDealFromFront.mockResolvedValue(deal);
    const mockUsersFindOrCreateByEmail = Users.findOrCreateByEmail.mockResolvedValue(user);
    const mockRefferalLinksAttachLink = RefferalLinks.attachLink.mockResolvedValue();
    const mockPaymentsCreate = Payments.create.mockResolvedValue(paymentData);
    const mockLogsCreatePaymentInfo = Logs.create.mockResolvedValue();
    const mockAxiosPost = axios.post.mockResolvedValue({ data: { Success: true, PaymentId: "payment_id", OrderId: "order_id", PaymentURL: "https://payment.url" } });

    // Execute the function
    const result = await createPayment(body);

    // Verify that the necessary methods were called with the correct arguments
    expect(mockLogsCreate).toHaveBeenCalledWith(null, "payment_info", "tinkoff_payment", body, null, "payment body");
    expect(mockAxiosGet).toHaveBeenCalledWith(currencyLink);
    expect(mockProductsFindOne).toHaveBeenCalledWith({ name: "Product Name" });
    expect(mockSubscriptionsFindOne).toHaveBeenCalledWith({
      user: user._id,
      subscription_type: "trial",
      status: "active",
    });
    expect(mockSubscriptionsCreateSubWithPayment).toHaveBeenCalledWith(
      user._id,
      deal.id,
      product._id,
      null,
      "inactive",
      paymentData
    );
    expect(mockCrmSearchPerson).toHaveBeenCalledWith("john@example.com", "1234567890", "John Doe");
    expect(mockCrmCreateDealFromFront).toHaveBeenCalledWith(
      person.id,
      "Tinkoff",
      "John Doe",
      "john@example.com",
      "1234567890",
      product,
      "utm_parameters",
      85
    );
    expect(mockUsersFindOrCreateByEmail).toHaveBeenCalledWith(
      "John Doe",
      "john@example.com",
      "1234567890",
      null,
      person.id,
      "Newspaper"
    );
    expect(mockRefferalLinksAttachLink).toHaveBeenCalledWith("referral_link", "user_id");
    expect(mockPaymentsCreate).toHaveBeenCalledWith(paymentData);
    expect(mockLogsCreatePaymentInfo).toHaveBeenCalledWith(
      null,
      "payment_info",
      "tinkoff_payment",
      {
        TerminalKey: "terminal_key",
        Amount: 100000,
        OrderId: expect.any(String),
        NotificationURL: "https://host/payment/tinkoffNotification",
        SuccessURL: "https://host_front/successful-payment",
        FailURL: "https://host_front/failed-payment",
        Recurrent: "N",
        CustomerKey: "user_id",
        Receipt: {
          Email: "john@example.com",
          Phone: "1234567890",
          Taxation: "usn_income",
          Items: [
            {
              Name: "Product Name",
              Quantity: 1,
              Amount: 100000,
              Price: 100000,
              Tax: "none",
              PaymentObject: "service",
              PaymentMethod: "prepayment",
            },
          ],
        },
      },
      null,
      "Payment body"
    );
    expect(mockAxiosPost).toHaveBeenCalledWith("https://securepay.tinkoff.ru/v2/Init", {
      TerminalKey: "terminal_key",
      Amount: 100000,
      OrderId: expect.any(String),
      NotificationURL: "https://host/payment/tinkoffNotification",
      SuccessURL: "https://host_front/successful-payment",
      FailURL: "https://host_front/failed-payment",
      Recurrent: "N",
      CustomerKey: "user_id",
      Receipt: {
        Email: "john@example.com",
        Phone: "1234567890",
        Taxation: "usn_income",
        Items: [
          {
            Name: "Product Name",
            Quantity: 1,
            Amount: 100000,
            Price: 100000,
            Tax: "none",
            PaymentObject: "service",
            PaymentMethod: "prepayment",
          },
        ],
      },
      DATA: "payment_data",
      Token: "payment_token",
      SendEmail: false,
    });

    // Verify the result
    expect(result).toEqual({
      status: 200,
      body: {
        payment_id: "payment_id",
        order_id: "order_id",
        payment_url: "https://payment.url",
      },
    });
  });

  it("should log an error if an exception occurs", async () => {
    // Mock the necessary data
    const body = {
      name: "John Doe",
      phone: "1234567890",
      email: "john@example.com",
      product_name: "Product Name",
      newspaper: "Newspaper",
      subscription_type: "trial",
      ref: "referral_link",
      utm: "utm_parameters",
    };

    const error = new Error("Test error");

    const mockLogsCreate = Logs.create.mockRejectedValue(error);

    // Execute the function
    const result = await createPayment(body);

    // Verify that the necessary methods were called with the correct arguments
    expect(mockLogsCreate).toHaveBeenCalledWith(null, "system_error", "system", error.stack.toString(), null);

    // Verify the result
    expect(result).toEqual({
      status: 500,
      body: { error: "Internal Server Error" },
    });
  });
});

describe('renewal', () => {
  it('should return the expected result', async () => {
    // Mock the necessary data for the test
    const subscription_id = 'subscription-id';
    const renewal = true;
    const payments = true;
    const terminal = 'terminal';
    const currencyLink = 'currency-link';
    const category = 'category';

    // Mock the dependencies
    axios.get.mockResolvedValue({
      data: {
        payload: {
          rates: [
            {
              category: category,
              sell: 10,
            },
          ],
        },
      },
    });
    axios.post.mockResolvedValue({
      data: {
        Success: true,
        PaymentId: 'payment-id',
        OrderId: 'order-id',
        PaymentURL: 'payment-url',
      },
    });
    crypto.randomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue('random-order-id'),
    });

    // Call the function
    const result = await renewal(subscription_id, renewal, payments);

    // Perform assertions
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      amount: expect.any(Number),
      url: 'payment-url',
      payment_id: expect.any(String),
    });
    expect(axios.get).toHaveBeenCalledWith(currencyLink);
    expect(axios.post).toHaveBeenCalledWith('https://securepay.tinkoff.ru/v2/Init', expect.any(Object));
    expect(crypto.randomBytes).toHaveBeenCalledWith(10);

    // Reset the mocks
    jest.clearAllMocks();
  });
});

// Test the failed function
describe('failed', () => {
  it('should perform the expected actions', async () => {
    // Mock the necessary data for the test
    const body = {
      PaymentId: 'payment-id',
    };
    const payment = {
      _id: 'payment-id',
      user: {
        telegramID: 'telegram-id',
      },
      subscription: 'subscription-id',
      crm_deal_id: 'crm-deal-id',
      send_notification: false,
    };

    // Mock the dependencies
    jest.spyOn(Payments, 'findOne').mockResolvedValue(payment);
    jest.spyOn(Payments, 'findByIdAndUpdate').mockResolvedValue();
    jest.spyOn(Subscriptions, 'findByIdAndUpdate').mockResolvedValue();
    jest.spyOn(Subscriptions, 'find').mockResolvedValue([]);
    jest.spyOn(crm, 'setDateCancelSub').mockResolvedValue();
    jest.spyOn(bot, 'sendMessage').mockResolvedValue();
    jest.spyOn(Users, 'updateOne').mockResolvedValue();
    jest.spyOn(Logs, 'create').mockResolvedValue();

    // Call the function
    await failed(body);

    // Perform assertions
    expect(Payments.findOne).toHaveBeenCalledWith({ payment_id: body.PaymentId });
    expect(Payments.findByIdAndUpdate).toHaveBeenCalledWith(payment._id, {
      status: 'failed',
    });
    expect(Subscriptions.findByIdAndUpdate).toHaveBeenCalledWith(payment.subscription, {
      status: 'inactive',
    });
    expect(crm.setDateCancelSub).toHaveBeenCalledWith(payment.user.telegramID, payment.crm_deal_id);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      payment.user.telegramID,
      'Оплата не была осуществлена, просим оплатить услугу в течение трех дней',
      expect.any(Object)
    );
    expect(Payments.findByIdAndUpdate).toHaveBeenCalledWith(payment._id, {
      send_notification: true,
    });
    expect(Subscriptions.findByIdAndUpdate).toHaveBeenCalledWith(payment.subscription, {
      date_delete_user: expect.any(Date),
    });
    expect(Users.updateOne).toHaveBeenCalledWith(
      { telegramID: payment.user.telegramID },
      { send_failed_payment: true, payment_method: 'tinkoff' }
    );
    expect(Logs.create).toHaveBeenCalledWith(
      null,
      'payment_info',
      'tinkoff_payment',
      body,
      payment.user,
      'payment failed'
    );

    // Reset the mocks
    jest.clearAllMocks();
  });
});

