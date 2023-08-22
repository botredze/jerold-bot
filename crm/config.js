require('dotenv').config();
const axios = require('axios')

const zendeskConfig = {
  url: process.env.ZENDESK_URL,
  email: process.env.ZENDESK_EMAIL,
  token: process.env.ZENDESK_TOKEN,

  // url: "https://api.getbase.com/v2",
  // email: "noreply@jerold.io",
  // token: "94735f50f08079a0ce8733e0bf1c1afe201015d3318db8baea519a813a11a062",
}

const zendeskBaseUrl = `${zendeskConfig.url}`;

const zendeskAxios = axios.create({
  baseURL: zendeskBaseUrl,
  headers: {
    'Authorization': `Bearer ${zendeskConfig.token}` ,
    'Content-Type': 'application/json'
  }
});

module.exports =  zendeskAxios