var express = require("express");
const UsersDatabase = require("../models/User");
const { hashPassword } = require("../utils");
var router = express.Router();

router.get("/", async function (req, res, next) {
  const users = await UsersDatabase.find();

  res.status(200).json({ code: "Ok", data: users });
});

/* GET users listing. */
router.get("/:email", async function (req, res, next) {
  const { email } = req.params;

  const user = await UsersDatabase.findOne({ email: email });

  if (!user) {
    res.status(404).json({ message: "user not found" });
    return;
  }

  res.status(200).json({ code: "Ok", data: user });
});
router.delete("/:email/delete", async function (req, res, next) {
  const { email } = req.params;

  const user = await UsersDatabase.findOne({ email: email });

  if (!user) {
    res.status(404).json({ message: "user not found" });
    return;
  }

  user.deleteOne();

  res.status(200).json({ code: "Ok" });
});



router.put("/:_id/profile/update", async function (req, res) {
  const { _id } = req.params;

  try {
    // First find the user to ensure they exist
    const existingUser = await UsersDatabase.findById(_id);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare update data
    const updateData = {
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      bio: req.body.bio,
      socials: req.body.social ? JSON.parse(req.body.social) : existingUser.socials
    };

    // Update the user document
    await existingUser.updateOne(
      { $set: updateData },
      { runValidators: true }
    );

    // Fetch the updated user to return in response
    const updatedUser = await UsersDatabase.findById(_id);

    return res.status(200).json({
      message: "Update was successful",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.put("/:_id/accounts/update", async function (req, res, next) {
  const { _id } = req.params;
  const accountDict = req.body;
  const data = accountDict.values;

  const user = await UsersDatabase.findOne({ _id: _id });

  if (!user) {
    res.status(404).json({ message: "user not found" });
    return;
  }

  const cummulative = Object.assign({}, user.accounts, JSON.parse(data));

  console.log(cummulative);

  try {
    await user.updateOne({
      accounts: {
        ...cummulative,
      },
    });

    return res.status(200).json({
      message: "Account was updated successfully",
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/:_id/accounts", async function (req, res, next) {
  const { _id } = req.params;

  const user = await UsersDatabase.findOne({ _id: _id });

  if (!user) {
    res.status(404).json({ message: "user not found" });
    return;
  }

  return res.status(200).json({
    data: user.accounts,
    message: "update was successful",
  });
});

module.exports = router;
