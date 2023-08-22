require("dotenv").config();
const axios = require("axios");
const pipedrive = require("pipedrive");
const defaultClient = new pipedrive.ApiClient();
let apiToken = defaultClient.authentications.api_key;
apiToken.apiKey = process.env.CRM_TOKEN;
const phoneUtil = require("phone").phone;
const Subscriptions = require("../model/Subscriptions");

const createDeals = async (title, amount, currency, name, email, phone, method) => {
  try {
    const dateNow = new Date(Date.now());
    const nextPay = new Date(Date.now()).setMonth(new Date(Date.now()).getMonth() + 1);

    const apiInstancePerson = new pipedrive.PersonsApi(defaultClient);
    const person = await apiInstancePerson.searchPersons(phone).then((r) => r.data.items[0].item);
    const deals = await apiInstancePerson.getPersonDeals(person.id).then((r) => r.data);

    if (deals) {
      const deal = deals[deals.length - 1];
      const dealapiInstance = new pipedrive.DealsApi(defaultClient);
      const paymentHistory = deal["bcaafcc6c4eae5f53a3d4d3d8ca23598d69a43cd"] + `\nОплатил ${amount} ${currency}`;
      const opts = pipedrive.UpdateDealRequest.constructFromObject({
        c628a25dcd660dd15bf7db199deeec5b426062dc: "Продлил подписку",
        eb6f0439481c8a84f88bdee084ea25eff32ab92d: dateNow.toISOString(),
        "858fa28d489b1cdb52147207b21f366186fb9096": new Date(nextPay).toISOString(),
        bcaafcc6c4eae5f53a3d4d3d8ca23598d69a43cd: paymentHistory,
        "8a09758d46547d75ac55f601ef38cef5f9871794": method,
        stage_id: 9,
      });

      await dealapiInstance
        .updateDeal(deal.id, opts)
        .then((r) => r.data)
        .catch((err) => console.log("Pipedrive Error createDeals", person.custom_fields, err));
      return;
    }

    let country = "";
    const testPhone = phoneUtil(phone);

    if (testPhone.isValid) {
      country = testPhone.countryIso2;
    }

    const apiInstanceDeal = new pipedrive.DealsApi(defaultClient);
    const opts = pipedrive.NewDeal.constructFromObject({
      title: `Buy ${title} from bot`,
      d290a81dd1f94ce65a4435af4fa757310767294b: name, // Імʼя юзера
      value: amount,
      currency: currency,
      c628a25dcd660dd15bf7db199deeec5b426062dc: `Оплатил подписку Essential`, // Статус
      "3d83b8de4975aec7ac71f309c2ed05a7a37dba3c": "Forex", // Пакет подписки
      da5478ed63ad26c509d942bcd2674b3b4600abe3: "Essential", // продукт підписки
      eb6f0439481c8a84f88bdee084ea25eff32ab92d: dateNow.toISOString(), // дата підписки / оплати
      "858fa28d489b1cdb52147207b21f366186fb9096": new Date(nextPay).toISOString(), // дата наступного платежа
      "7512528fcc0d8403d69f581196318593bd29f81e": person.emails[0], //пошта
      c7001075c6b3d8c64a75525ac032f760b56a4ed3: person.phones[0], // телефон
      "17c6b2221ac572f06a9aadd18f65de6466604be3": dateNow.toISOString(), // дата додавання в канал
      "89081150ed6755ed4f3c7f4ce3d952c4d304f8b9": "", // ЧБ
      bcaafcc6c4eae5f53a3d4d3d8ca23598d69a43cd: `Оплатил ${amount} ${currency}`, // Історія платежів
      "8a09758d46547d75ac55f601ef38cef5f9871794": method, // спосіб оплати
      "8ca8f6bf29bad2862559840199ee5ab88ca0a0bc": country, // країна
      person_id: person.id,
      stage_id: 8,
    });
    await apiInstanceDeal.addDeal(opts);
  } catch (error) {
    console.log(error);
  }
};

const searchPersonAndUpdate = async (phone, id) => {
  try {
    const apiInstance = new pipedrive.PersonsApi(defaultClient);
    const person = await apiInstance.searchPersons(phone).then((r) => r.data.items[0].item);

    const opts = pipedrive.UpdatePerson.constructFromObject({
      df6fe569c87bc5585318498a6988301f06c4b549: id,
    });

    await apiInstance.updatePerson(person.id, opts);
    return { result: 1, person };
  } catch (error) {
    console.log(error);
    return { result: 0 };
  }
};

const setDateCancelSub = async (telegramID, deal_id, user_canceled = false) => {
  try {
    const who_canceled = user_canceled ? "Отписался сам" : "Отписан системой";

    const dealapiInstance = new pipedrive.DealsApi(defaultClient);
    const opts = pipedrive.UpdateDealRequest.constructFromObject({
      c628a25dcd660dd15bf7db199deeec5b426062dc: "Отписался",
      "52d14888b16b91ae45986f1c2bd3a70b9fb2f718": new Date(Date.now()).toISOString(),
      "858fa28d489b1cdb52147207b21f366186fb9096": null,
      dfeff3240cbe76fa0a96d2779e1c466df86dd7c3: who_canceled,
    });

    if (deal_id) {
      await dealapiInstance
        .updateDeal(deal_id, opts)
        .then((r) => r.data)
        .catch((err) => console.log("Pipedrive Error setDateCancelSub", telegramID, err));

      return;
    }

    const apiInstance = new pipedrive.PersonsApi(defaultClient);
    const person = await apiInstance.searchPersons(telegramID).then((r) => r.data.items[0].item);

    const deals = await apiInstance.getPersonDeals(person.id).then((r) => r.data);
    const deal = deals[deals.length - 1];

    await dealapiInstance
      .updateDeal(deal.id, opts)
      .then((r) => r.data)
      .catch((err) => console.log("Pipedrive Error setDateCancelSub", telegramID, err));
  } catch (error) {
    console.log(error);
  }
};

const setRefunded = async (telegramID, deal_id) => {
  try {
    const dealapiInstance = new pipedrive.DealsApi(defaultClient);
    const opts = pipedrive.UpdateDealRequest.constructFromObject({
      c628a25dcd660dd15bf7db199deeec5b426062dc: "Отписался",
      "52d14888b16b91ae45986f1c2bd3a70b9fb2f718": new Date(Date.now()).toISOString(),
      "858fa28d489b1cdb52147207b21f366186fb9096": null,
      "89081150ed6755ed4f3c7f4ce3d952c4d304f8b9": "Да",
    });

    if (deal_id) {
      await dealapiInstance
        .updateDeal(deal_id, opts)
        .then((r) => r.data)
        .catch((err) => console.log("Pipedrive Error setDateCancelSub", telegramID, err));

      return;
    }

    const apiInstance = new pipedrive.PersonsApi(defaultClient);
    const person = await apiInstance.searchPersons(telegramID).then((r) => r.data.items[0].item);

    const deals = await apiInstance.getPersonDeals(person.id).then((r) => r.data);
    const deal = deals[deals.length - 1];

    await dealapiInstance
      .updateDeal(deal.id, opts)
      .then((r) => r.data)
      .catch((err) => console.log("Pipedrive Error setRefunded", telegramID, err));
  } catch (error) {
    console.log(error);
  }
};

const findByEmail = async (email) => {
  const apiInstance = new pipedrive.LeadsApi(defaultClient);
  const lead = await apiInstance.searchLeads(email).then((r) => r.data.items[0].item);
  return lead;
};

const findDealByPerson = async (id) => {
  const apiInstancePerson = new pipedrive.PersonsApi(defaultClient);
  const deals = await apiInstancePerson.getPersonDeals(id).then((r) => r.data);
  return deals;
};

const getAllDeals = async () => {
  const apiInstancePerson = new pipedrive.DealsApi(defaultClient);
  const deals = await apiInstancePerson.getDeals({ limit: 500, stage_id: 6 }).then((r) => r.data);
  return deals;
};

const updateDeal = async (id) => {
  const apiInstanceDeal = new pipedrive.DealsApi(defaultClient);
  let opts = pipedrive.UpdateDealRequest.constructFromObject({
    stage_id: 8,
  });

  await apiInstanceDeal.updateDeal(id, opts);
};

const updateDealField = async (id, field, value) => {
  const apiInstanceDeal = new pipedrive.DealsApi(defaultClient);
  let opts = pipedrive.UpdateDealRequest.constructFromObject({
    [field]: value,
  });

  await apiInstanceDeal.updateDeal(id, opts);
  return true;
};

const retrievePerson = async (id) => {
  const apiInstance = new pipedrive.PersonsApi(defaultClient);
  const person = await apiInstance.getPerson(id).then((r) => r.data);
  return person;
};

// start bot

const startBotWithCrm = async (deal_id, telegram_id) => {
  const apiInstanceDeal = new pipedrive.DealsApi(defaultClient);
  const person = await apiInstanceDeal.getDealPersons(deal_id).then((r) => r.data[0]);
  // console.log(person);
  const apiInstancePerson = new pipedrive.PersonsApi(defaultClient);
  const opts = pipedrive.UpdatePerson.constructFromObject({
    df6fe569c87bc5585318498a6988301f06c4b549: telegram_id,
  });

  await apiInstancePerson.updatePerson(person.id, opts);
  return person;
};

//Payment on Front
const searchPerson = async (email, phone, name, telegram_id) => {
  const apiInstance = new pipedrive.PersonsApi(defaultClient);

  let persons = [];

  if (email) {
    persons = await apiInstance.searchPersons(email).then((r) => r.data.items);
  }

  if (!persons.length && phone) {
    persons = await apiInstance.searchPersons(phone).then((r) => r.data.items);
  }

  if (email && phone) {
    persons = persons.filter((el) => el.item.phones[0] === phone && el.item.emails[0] === email);
  }

  if (!persons.length) {
    const opts = pipedrive.NewPerson.constructFromObject({
      name: name || "none",
      email: [{ value: email || null, primary: true }],
      phone: [{ value: phone || null, primary: true }],
      df6fe569c87bc5585318498a6988301f06c4b549: telegram_id || "",
    });

    persons[0] = await apiInstance.addPerson(opts).then((r) => r.data);

    return persons[0];
  }

  return persons[0].item;
};

const createDealFromFront = async (person_id, payment_method, name, email, phone, product, utm, exchange_rate) => {
  let country = "";
  const testPhone = phoneUtil(phone);

  if (testPhone.isValid) {
    country = testPhone.countryIso2;
  }

  const { price, currency } = product;
  const product_name = product.name.split("_");
  const apiInstanceDeal = new pipedrive.DealsApi(defaultClient);
  const package = product_name[2] ? `${product_name[1]} ${product_name[2]}` : product_name[1];
  const opts = pipedrive.NewDeal.constructFromObject({
    title: `Buy Jerold / ${product_name[0]} / ${package} from site`,
    d290a81dd1f94ce65a4435af4fa757310767294b: name, // Імʼя юзера
    value: price,
    currency: currency.toUpperCase(),
    c628a25dcd660dd15bf7db199deeec5b426062dc: `Оставил контакт`, // Статус
    "3d83b8de4975aec7ac71f309c2ed05a7a37dba3c": package, // Пакет подписки
    da5478ed63ad26c509d942bcd2674b3b4600abe3: product_name[0], // продукт підписки
    "7512528fcc0d8403d69f581196318593bd29f81e": email, //пошта
    c7001075c6b3d8c64a75525ac032f760b56a4ed3: phone, // телефон
    "8a09758d46547d75ac55f601ef38cef5f9871794": payment_method, // спосіб оплати
    "8ca8f6bf29bad2862559840199ee5ab88ca0a0bc": country, // країна
    c2a9566c8558c1fe0064eec4c364872674efbe68: utm?.utm_campaign || "", //utm_campaign
    "9d5fc703db6a490eae1f27677cbc6d5f0320a193": utm?.utm_content || "", //utm_content
    "0d93f3fae80a1ad50237401abb931294a72261df": utm?.utm_medium || "", // utm_medium
    d80c2a9ccc25532251661457b7dace337ad61d10: utm?.utm_source || "", // utm_source
    "8d8f690d54d72c368419482a5eea3a3c05cceb54": utm?.utm_term || "", // utm_term
    "364a7dc65729cefe4a737e7486f46b1185c9970a": exchange_rate || "",
    person_id: person_id,
  });

  const deal = await apiInstanceDeal.addDeal(opts).then((r) => r.data);
  return deal;
};

const updateDealAfterPayment = async (id, payment_method, subscription_id) => {
  const subscription = await Subscriptions.findOne({ _id: subscription_id })
    .populate({
      path: "payments",
      populate: {
        path: "product",
      },
    })
    .populate("product");

  const dateNow = new Date(Date.now());
  const nextPay = new Date(Date.now()).setMonth(new Date(Date.now()).getMonth() + 1);
  const apiInstanceDeal = new pipedrive.DealsApi(defaultClient);
  const deal = await apiInstanceDeal.getDeal(id).then((r) => r.data);
  let paymentHistory = "";

  if (deal["bcaafcc6c4eae5f53a3d4d3d8ca23598d69a43cd"]) {
    paymentHistory =
      deal["bcaafcc6c4eae5f53a3d4d3d8ca23598d69a43cd"] +
      `\nОплатил ${payment_method.amount_paid / 100} ${payment_method.currency}`;
  } else {
    paymentHistory = `\nОплатил ${payment_method.amount_paid / 100} ${payment_method.currency}`;
  }

  let status = "Оплатил подписку Essential";
  let stage = 8;

  if (subscription.payments.length > 1) {
    status = "Продлил подписку";
    stage = 9;
  }

  if (subscription.product.is_trial) {
    stage = 7;
  }

  let trial_payment = null;

  if (subscription.payments.length > 1) {
    trial_payment = subscription.payments.filter((el) => {
      if (el.product.is_trial) {
        return el;
      }
    });
  }

  console.log(trial_payment);

  if (trial_payment) {
    let opts = pipedrive.UpdateDealRequest.constructFromObject({
      c628a25dcd660dd15bf7db199deeec5b426062dc: "Тест => Ессеншиал", // Статус
    });

    await apiInstanceDeal.updateDeal(trial_payment[0].crm_deal_id, opts);
  }

  let opts = pipedrive.UpdateDealRequest.constructFromObject({
    c628a25dcd660dd15bf7db199deeec5b426062dc: status, // Статус
    eb6f0439481c8a84f88bdee084ea25eff32ab92d: dateNow.toISOString(), // дата підписки / оплати
    "858fa28d489b1cdb52147207b21f366186fb9096": new Date(nextPay).toISOString(), // дата наступного платежа
    "17c6b2221ac572f06a9aadd18f65de6466604be3": dateNow.toISOString(), // дата додавання в канал
    bcaafcc6c4eae5f53a3d4d3d8ca23598d69a43cd: paymentHistory,
    "52d14888b16b91ae45986f1c2bd3a70b9fb2f718": "",
    stage_id: stage,
  });

  await apiInstanceDeal.updateDeal(id, opts);
};

const getAllDealsAnalytics = async () => {
  const changeDeals = (deals) => {
    return deals.map((el) => {
      const stage = {
        6: "Новая заявка",
        7: "Пробный период",
        8: "1 Покупка(0 месяц)",
        9: "Пролонгация",
        10: "Отписан",
      };

      const status = {
        25: "Оплатил подписку Essential",
        21: "Оставил контакт",
        23: "Продлил подписку",
        24: "Отписался",
        26: "Оплатил подписку Fundamental",
      };

      const product = {
        32: "Essential",
        33: "Fundamental",
      };

      const package = {
        31: "Forex",
      };

      return {
        "id Сделки": el.id,
        email: el["7512528fcc0d8403d69f581196318593bd29f81e"] || "",
        "id contact": el?.person_id?.value || "",
        phone: el["c7001075c6b3d8c64a75525ac032f760b56a4ed3"] || "",
        "owner Сделки": el.user_id.id || "",
        "ресурс Сделки": el["d80c2a9ccc25532251661457b7dace337ad61d10"] || "",
        utm_source: el["d80c2a9ccc25532251661457b7dace337ad61d10"] || "",
        utm_medium: el["0d93f3fae80a1ad50237401abb931294a72261df"] || "",
        utm_campaign: el["c2a9566c8558c1fe0064eec4c364872674efbe68"] || "",
        utm_term: el["8d8f690d54d72c368419482a5eea3a3c05cceb54"] || "",
        utm_content: el["9d5fc703db6a490eae1f27677cbc6d5f0320a193"] || "",
        "Product ID": el["da5478ed63ad26c509d942bcd2674b3b4600abe3"] || "",
        "Package ID": el["3d83b8de4975aec7ac71f309c2ed05a7a37dba3c"] || "",
        Пакет: package[el["3d83b8de4975aec7ac71f309c2ed05a7a37dba3c"]] || "",
        "Сумма сделки": el.currency === "USD" ? el.value : 79,
        "Фактическая сумма сделки": el.value || "",
        "Имя Сделки": el.title || "",
        "Contact name": el?.person_id?.name || "",
        Created_Time: el.add_time || "",
        Modificate_Time: el.update_time || "",
        "Статус Сделки": status[el["c628a25dcd660dd15bf7db199deeec5b426062dc"]] || "",
        "Дата подписки": el["eb6f0439481c8a84f88bdee084ea25eff32ab92d"] || "",
        "Дата начала подписки": el["eb6f0439481c8a84f88bdee084ea25eff32ab92d"] || "",
        "Дата окончания подписки": el["858fa28d489b1cdb52147207b21f366186fb9096"] || "",
        "Дата отмены подписки": el["52d14888b16b91ae45986f1c2bd3a70b9fb2f718"] || "",
        "Дата следующего списания": el["858fa28d489b1cdb52147207b21f366186fb9096"] || "",
        "Воронка продаж": stage[el.stage_id] || "",
        "Время выигрыша": "",
        "Последнее изменение этапа": el.stage_change_time || "",
        Этап: stage[el.stage_id] || "",
        Состояние: "",
        "Денежная единица": el.currency || "",
        "Сделка создана": el.add_time || "",
        "Последнее электронное письмо отправлено": "",
        "Последнее электронное письмо получено": "",
      };
    });
  };

  const apiInstancePerson = new pipedrive.DealsApi(defaultClient);
  // const deals = await apiInstancePerson.getDeals({ limit: 500, sort: "add_time DESC" }).then((r) => r.data);
  const deals_amount_of_cycle = await apiInstancePerson
    .getDealsSummary()
    .then((r) => Math.ceil(r.data.total_count / 500));

  const dealsArr = [];

  for (let i = 0; i < deals_amount_of_cycle; i++) {
    const deals = await apiInstancePerson
      .getDeals({ limit: 500, start: dealsArr.length, sort: "add_time ASC" })
      .then((r) => r.data);
    dealsArr.push(...deals);
  }
  const updatedDeals = changeDeals(dealsArr);
  return updatedDeals;
};

const getAllPersonAnalytics = async () => {
  const changeLeads = (leads) => {
    const package = {
      31: "Forex",
    };

    return leads.map((el) => {
      return {
        "id Лида": el.id,
        "email Лида": el["7512528fcc0d8403d69f581196318593bd29f81e"] || "",
        "id contact": el?.person_id || "",
        phone: el["c7001075c6b3d8c64a75525ac032f760b56a4ed3"] || "",
        "owner Лида": el.owner_id,
        "ресурс Лида": el["d80c2a9ccc25532251661457b7dace337ad61d10"] || "",
        utm_source: el["d80c2a9ccc25532251661457b7dace337ad61d10"] || "",
        utm_medium: el["0d93f3fae80a1ad50237401abb931294a72261df"] || "",
        utm_campaign: el["c2a9566c8558c1fe0064eec4c364872674efbe68"] || "",
        utm_term: el["8d8f690d54d72c368419482a5eea3a3c05cceb54"] || "",
        utm_content: el["9d5fc703db6a490eae1f27677cbc6d5f0320a193"] || "",
        "Product ID": el["da5478ed63ad26c509d942bcd2674b3b4600abe3"] || "",
        "Package ID": el["3d83b8de4975aec7ac71f309c2ed05a7a37dba3c"] || "",
        Пакет: package[el["3d83b8de4975aec7ac71f309c2ed05a7a37dba3c"]] || "",
        "Лид Name": el.title || "",
        "Contact name": el["d290a81dd1f94ce65a4435af4fa757310767294b"] || "",
        Created_Time: el.add_time || "",
        "Статус Лида": "",
        "Заинтересован во втором пакете": "",
        "Дата подписки": "",
        "Дата начала подписки": "",
        "Дата окончания подписки": "",
        "Дата отмены подписки": "",
        "Дата следующего списания": "",
      };
    });
  };
  const apiInstance = new pipedrive.LeadsApi(defaultClient);
  let more = true;
  const leads_arr = [];

  while (more) {
    const { leads, more_items } = await apiInstance.getLeads({ limit: 500, start: leads_arr.length }).then((r) => {
      return {
        leads: r.data,
        more_items: r.additional_data.pagination.more_items_in_collection,
      };
    });

    leads_arr.push(...leads);
    more = more_items;
  }

  const leadsUpdated = changeLeads(leads_arr);
  return leadsUpdated;
};

const updateSubscriptionEndDate = async (telegramID, endDate) => {
  try {
    const apiInstance = new pipedrive.PersonsApi(defaultClient);

    const person = await apiInstance.searchPersons(telegramID).then((r) => r.data.items[0].item);

    const dealapiInstance = new pipedrive.DealsApi(defaultClient);

    const opts = pipedrive.UpdateDealRequest.constructFromObject({
      c628a25dcd660dd15bf7db199deeec5b426062dc: 'Обновлен',
      '52d14888b16b91ae45986f1c2bd3a70b9fb2f718': endDate,
      '858fa28d489b1cdb52147207b21f366186fb9096': null,
    });

    const deals = await apiInstance.getPersonDeals(person.id).then((r) => r.data);
    const deal = deals[deals.length - 1];

    await dealapiInstance
      .updateDeal(deal.id, opts)
      .then((r) => r.data)
      .catch((err) => console.log('Pipedrive Error update end date', telegramID, err));
  } catch (err) {
    console.log(err);
    return { result: 0, error: err.message };
  }
};
module.exports = {
  createDeals,
  searchPersonAndUpdate,
  setDateCancelSub,
  setRefunded,
  findByEmail,
  findDealByPerson,
  getAllDeals,
  updateDeal,
  searchPerson,
  createDealFromFront,
  updateDealAfterPayment,
  startBotWithCrm,
  getAllDealsAnalytics,
  getAllPersonAnalytics,
  updateDealField,
  updateSubscriptionEndDate,
};
