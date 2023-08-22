const crypto = require("crypto");
const RefferalLinks = require("../model/Referral_links");
const Users = require("../model/Users");
const { createHash } = require("crypto");

const render = async (req, res) => {
  res.render("cabinet");
};

const generateReferralLink = async (req, res) => {
  const referral_link = crypto.randomBytes(10).toString("hex");
  const data = await RefferalLinks.createLink(referral_link);
  res.send({ link: data.link, number_of_users: data.number_of_users });
};

const getLink = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email }).populate("referral_link");
    res.send({ data: user.referral_link.link });
  } catch (error) {
    res.send({ error: false, message: "server error" });
  }
};

const getStatistics = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email }).populate({
      path: "referral_link",
      populate: {
        path: "users",
        select: "first_name referral_program",
      },
    });

    res.send({ error: false, data: user.referral_link });
  } catch (error) {
    res.send({ error: true, message: "server error" });
  }
};

const updLink = async (req, res) => {
  const data = await RefferalLinks.findOne({ link: req.query.link });
  const number_of_users = data.number_of_users + 1;
  await RefferalLinks.findOneAndUpdate({ link: data.link }, { number_of_users });
  res.send("OK");
};

const registration = async (req, res) => {
  const { email, password } = req.body;

  const user = await Users.findOne({ email });

  if (!user) {
    res.send({ error: true, message: "User not found" });
    return;
  }

  const userPassword = createHash("sha256").update(password).digest("hex");

  const updatedUser = await Users.findOneAndUpdate(
    { email },
    {
      password: userPassword,
    }
  );

  if (updatedUser) {
    return res.send({ error: false, user: { email: updatedUser.email } });
  } else {
    return res.send({ error: true });
  }
};
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await Users.findOne({ email });

  if (!user) {
    res.send({ error: true, message: "User not found" });
    return;
  }

  const userPassword = createHash("sha256").update(password).digest("hex");

  if (userPassword === user.password) {
    return res.send({ error: false, user: { email: user.email } });
  } else {
    return res.send({ error: true, message: "password incorrect" });
  }
};

module.exports = {
  render,
  getLink,
  getStatistics,
  updLink,
  registration,
  login,
  generateReferralLink,
};
