require("dotenv").config();

module.exports = {
  dbhost: process.env.DB_HOST,
  dbport: process.env.DB_PORT,
  dbname: process.env.DB_NAME,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
};
