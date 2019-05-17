/**
 *
 * Simple Restful API server with JSON Web Token authentication
 *
 */

//  ------------------------------------------------------------

// Include Dependencies
const source = 'db.json';
const jsonServer = require('json-server');
const fs = require('fs-extra');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
const jwt = require('jsonwebtoken');

// Variables
const appSecretKey = 'someapisecrethere';
const HTTP_STATUS = {
  Ok: 200,
  Created: 201,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  UnprocessableEntity: 422,
};
// Json server setup
const server = jsonServer.create();
const router = jsonServer.router(source);
// App middlewares
const middlewares = [
  jsonServer.defaults({ noCors: true }),
  [
    (req, res, next) =>
      fs.readJson(source).then(contents => {
        router.db.assign(contents).write();
        next();
      }),
  ],
];
server.use(middlewares);
// Using JSON Server bodyParser for HTTP methods
server.use(jsonServer.bodyParser);
// Allow API endpoints
let allowEnpoints = [
  '/db',
  '/api-token-auth',
  '/api-token-refresh',
  '/api-password-reset',
  '/api-password-reset-confirm',
];
/*=============================================
=             Application Interceptor         =
=============================================*/
server.use((req, res, next) => {
  // Check permited Endpoints
  if (allowEnpoints.indexOf(req.url) >= 0) {
    return next();
  }
  // Get Token from request headers
  let token = req.headers['authorization'];
  if (!token) {
    res.status(HTTP_STATUS.Unauthorized).send("Sorry you don't have access");
  } else {
    // Clean token string
    token = token.replace('Bearer ', '');
    // Validate token
    jwt.verify(token, appSecretKey, function(error, decoded) {
      if (error) {
        return res
          .status(HTTP_STATUS.Unauthorized)
          .send({ auth: false, message: 'Sorry invalid token' });
      } else {
        // Hold current user
        req.userId = decoded.id;
        console.log(req.userId);
      }
    });
    // Go to JSON Server db routers
    next();
  }
});
/*=====  End of Application Interceptor  ======*/

/*=============================================
=               TOKEN GENERATOR               =
=============================================*/

// GET Token
server.post('/api-token-auth', (req, res) => {
  // Get payload request
  const payload = req.body;
  // Check for empty fields
  if (!payload.email || !payload.password) {
    return res.sendStatus(HTTP_STATUS.Unauthorized);
  }
  // Get user from db
  let user = db
    .get('users')
    .filter(user => user.email === payload.email)
    .value();
  //  Check if User exist on db
  if (user.length === 0) {
    return res
      .status(HTTP_STATUS.NotFound)
      .send("You don't have an account yet");
  }
  // Set user
  user = user[0];
  // Check user password
  if (user.password !== payload.password) {
    return res
      .status(HTTP_STATUS.BadRequest)
      .send('Sorry, invalid combination of email and password');
  }
  // Generate a Token
  const token = jwt.sign({ id: user.id }, appSecretKey, { expiresIn: 86400 });
  // Return a User Object with generated token
  res.status(200).send({
    auth: true,
    token: token,
    user: user,
  });
});

//  REFRESH Token
server.get('/api-token-refresh', (req, res) => {
  // Get Token from Request Header
  let token = req.headers['authorization'];
  token = token.replace('Bearer ', '');
  // Check Token
  jwt.verify(token, appSecretKey, function(error, decoded) {
    if (error) {
      return res
        .status(HTTP_STATUS.UnprocessableEntity)
        .send({ auth: false, message: 'Refresh Token failed' });
    }
    // Generate new Token
    let token = jwt.sign({ id: decoded.id }, appSecretKey, {
      expiresIn: 86400,
    });
    // Get User
    let user = db
      .get('users')
      .find({ id: decoded.id })
      .value();

    // Return a User Object with new generated token
    res.status(200).send({
      auth: true,
      token: token,
      user: user,
    });
  });
});

/*==========  End of TOKEN GENERATOR  ========*/

/*=============================================
=                 User Settings               =
=============================================*/

// Change Password for logged Users {Params: password, new_passoword}
server.post('/users/change-password', (req, res) => {
  // Get current password from Request body
  let password = req.body.password;
  // Get new password from request body
  let new_password = req.body.new_password;
  // Get authenticated User from db
  let user = db
    .get('users')
    .find({ id: req.userId })
    .value();
  // Check passoword
  if (user.password !== password)
    return res
      .status(HTTP_STATUS.BadRequest)
      .send('Your current password is invalid');
  // Store the new Password
  db.get('users')
    .find({ id: req.userId })
    .assign({ password: new_password })
    .write()
    .then(() => {
      console.log('Password changed');
    });

  res.status(HTTP_STATUS.Ok).send('Your password has changed');
});

/*===========  End of User Settings  =========*/

/*=============================================
=                  API Settings               =
=============================================*/

// Reset password for non logged users {Params: email}
server.post('/api-password-reset', (req, res) => {
  // Get email from request body
  let email = req.body.email;
  // Get User from db
  var user = db
    .get('users')
    .filter(user => user.email === email)
    .value();
  // Check User
  if (user.length == 0) {
    return res
      .status(HTTP_STATUS.NotFound)
      .send("You don't have an account yet");
  }
  // Set User
  user = user[0];
  // Generate a temporary Token
  const token = jwt.sign({ id: user.id }, appSecretKey, { expiresIn: 86400 });
  // Save new generated Token on password resets table
  db.get('password_reset_tokens')
    .push({
      user_id: user.id,
      token: token,
    })
    .write();

  res.status(200).send({ token: token });
});

// Validate new password request {Params: token, new password}
server.post('/api-password-reset-confirm', (req, res) => {
  // Get new password from request body
  let new_password = req.body.new_password;
  let token = db
    .get('password_reset_tokens')
    .find({ token: req.body.token })
    .value();
  // Check Token
  if (!token) {
    return res
      .status(HTTP_STATUS.UnprocessableEntity)
      .send('Missing or invalid temporary Token');
  }
  // Get user and temporary Token
  db.get('users')
    .find({ id: token.user_id })
    .assign({ password: new_password })
    .write()
    .then(() => {
      db.get('password_reset_tokens')
        .remove({ user_id: token.user_id })
        .write();
    });

  res.status(HTTP_STATUS.Ok).send('Your password was reseted');
});

/*=============  End of API Settings  ========*/

// Start server
server.use(router);
server.listen(3000, () => {
  console.log('Application running...');
});
