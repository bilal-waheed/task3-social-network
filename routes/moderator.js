const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/jwtAuth');

const { validateSignUpData, validateLoginData } = require('../validation/joi');
const Post = require('../models/Post');
const Moderator = require('../models/Moderator');

const router = express.Router();

// public route
// sign up
router.post('/signup', (req, res) => {
  Moderator.findOne({ username: req.body.username }).then((mod) => {
    if (mod) return res.status(400).json({ error: 'moderator already exists' });

    const { firstName, lastName, username, email, password } = req.body;

    const { value, error } = validateSignUpData({
      firstName,
      lastName,
      username,
      email,
      password
    });
    if (error) return res.status(400).json(error.details[0].message);

    const newMod = new Moderator({
      firstName,
      lastName,
      username,
      email,
      password
    });

    // Hashing the password
    bcrypt.genSalt(10, (err, salt) => {
      if (err) throw err;
      bcrypt.hash(password, salt, (error, hash) => {
        if (error) throw error;
        newMod.password = hash;

        newMod
          .save()
          .then((modObj) => {
            const token = jwt.sign(
              { id: modObj.id },
              process.env.SECRET_OR_PRIVATE_KEY,
              { expiresIn: '24h' }
            );
            res.status(201).json({
              success: true,
              msg: 'sign up successful',
              modObj,
              token
            });
          })
          .catch((modErr) => res.status(500).json(modErr));
      });
    });
  });
});

// public route
// log in
router.post('/login', (req, res) => {
  // check if the moderator exists
  Moderator.findOne({ username: req.body.username }).then((mod) => {
    if (!mod) return res.status(404).json({ error: 'Moderator not found' });

    const { username, password } = req.body;

    const { value, error } = validateLoginData({ username, password });
    if (error) return res.status(400).json(error.details[0].message);

    // Comparing the password
    bcrypt.compare(password, mod.password).then((isMatched) => {
      if (isMatched) {
        const token = jwt.sign(
          { id: mod.id },
          process.env.SECRET_OR_PRIVATE_KEY,
          { expiresIn: '24h' }
        );
        res
          .status(200)
          .json({ success: true, msg: 'login successful', mod, token });
      } else {
        res.status(400).json({ error: 'password incorrect' });
      }
    });
  });
});

router.get('/posts', authenticate, (req, res) => {
  Post.find()
    .then((posts) => {
      const mappedPosts = posts.map((post) => ({
        _id: post.id,
        title: post.title,
        content: post.content,
        dateCreated: post.dateCreated
      }));
      res.status(200).json({ success: true, posts: mappedPosts });
    })
    .catch((err) => {
      res.status(500).json({ error: err });
    });
});

module.exports = router;