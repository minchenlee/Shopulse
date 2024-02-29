const express = require('express');
const UserModel = require('../db/model/user');
let router = express.Router();

router.post('/', async (req, res) => {
  try {
    const user = new UserModel();
    await user.save();
    res.status(201).send({ userId: user._id, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send({ error: 'Failed to create user' });
  }
});

module.exports = router;
