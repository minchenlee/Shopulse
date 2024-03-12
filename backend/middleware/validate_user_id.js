const UserModel = require('../db/model/user');

// check if the user exists
async function validateUserId(req, res, next) {
  const userId = req.query.userId || req.body.userId;
  const user = await UserModel.findById(userId);
  if (!user) {
    return res.status(404).send({ error: `User not found with ID ${userId}` });
  }
  next();
}

module.exports = validateUserId;
