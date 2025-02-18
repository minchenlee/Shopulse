const express = require('express');
const UserModel = require('../db/model/user');
let router = express.Router();

// Check if the user exists
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  const user = await UserModel.findById(userId);
  if (!user) {
    return res.status(404).send({ error: `User not found with ID ${userId}` });
  }
  res.status(200).send({ message: 'User found' });
});


router.get('/statistic', async (req, res) => {
  const userId = req.query.userId;
  // get the thread ID for the user, send the request to the thread service
  // to get the thread details
  const response = await fetch(`http://localhost:3000/chat/threads?userId=${userId}`);
  const threads = await response.json()
  
  console.log(threads);
  res.status(200).send({ message: 'Statistic found'});
});


// Create a new user
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId;
    // if the user id is provided, then use this user id to create a user
    if (userId) {
      const user = new UserModel({ _id: userId });
      await user.save();
      res.status(201).send({ userId: user._id, message: 'User created successfully' });
      return;
    }

    const user = new UserModel();
    await user.save();
    res.status(201).send({ userId: user._id, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send({ error: 'Failed to create user' });
  }
});

module.exports = router;
