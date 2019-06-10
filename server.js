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
const shortid = require('shortid');

// Config Constants
const SECRET_KEY = 'someapisecrethere';
const EXPIRES_IN = 86400; // 24h
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
const app = jsonServer.create();
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
app.use(middlewares);
// Using JSON Server bodyParser for HTTP methods
app.use(jsonServer.bodyParser);
// Allow API endpoints
let allowEnpoints = [
  '/db',
  '/api/register',
  '/api/signup',
  '/api/token-refresh',
  '/api/password-reset',
  '/api/password-reset-confirm',
];

/*=============================================
=             Application Interceptor         =
=============================================*/
// Avoid CORS issue
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Content-Length, X-Requested-With'
  );

  //intercepts OPTIONS method
  if ('OPTIONS' === req.method) {
    //respond with 200
    res.send(200);
  }
  next();
});

app.use((req, res, next) => {
  // Check permited Endpoints
  if (
    allowEnpoints.indexOf(req.url) >= 0 ||
    req.url.substring(0, 6) == '/apidoc'
  ) {
    return next();
  }
  // Get Token from request headers
  let token = req.headers['authorization'];
  if (!token) {
    res
      .status(HTTP_STATUS.Unauthorized)
      .send({ error: 'Sorry, missing or malformed token' });
  } else {
    // Clean token string
    token = token.replace('Bearer ', '');
    // Validate token
    jwt.verify(token, SECRET_KEY, function(error, decoded) {
      if (error) {
        return res
          .status(HTTP_STATUS.Unauthorized)
          .send({ auth: false, error: 'Sorry invalid token' });
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

/**
 * @api {post} /api/token-refresh Refresh User Token
 * @apiDescription Refresh user token using the current one. Tokens are valid for 24hours.
 * @apiHeader {String} authorization Users unique access-token.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer <token>"
 *     }
 * @apiGroup Token
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          "auth": true,
 *          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
 *          "user": {
 *            "email": "johnny@cash.com",
 *            "username": "Johnny Cash",
 *            "password": "123456",
 *            "type": "Customer",
 *            "id": 1
 *          }
 *      }
 *
 * @apiError UnprocessableEntity The server understands the content type of the request entity but was unable to process the contained instructions.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "auth": "false",
 *       "error": "Refresh Token failed"
 *     }
 */
app.get('/api/token-refresh', (req, res) => {
  // Get Token from Request Header
  let token = req.headers['authorization'];
  token = token.replace('Bearer ', '');
  // Check Token
  jwt.verify(token, SECRET_KEY, function(error, decoded) {
    if (error) {
      return res
        .status(HTTP_STATUS.UnprocessableEntity)
        .send({ auth: false, error: 'Refresh Token failed' });
    }
    // Generate new Token
    let token = jwt.sign({ id: decoded.id }, SECRET_KEY, {
      expiresIn: EXPIRES_IN,
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
=           User Register and Login           =
=============================================*/

/**
 * @api {post} /api/register Register
 * @apiDescription Create a new User.
 * @apiGroup User
 *
 * @apiParam {String} username User name
 * @apiParam {String} email User email-address
 * @apiParam {String} password User password.
 * @apiParam {String} type User profile type. Possible: Admin or Customer
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *        "username":"Jesse James"
 *        "email": "james@jesse.com",
 *        "password": "123456",
 *        "type": "Customer",
 *        "id": 1
 *     }
 *
 * @apiError UnprocessableEntity The server understands the content type of the request entity but was unable to process the contained instructions.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "error": "Missing mandatory fields"
 *     }
 */
app.post('/api/register', (req, res) => {
  // Get new password from request body
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const type = req.body.type;
  // Check For Missing fields
  if (!email || !username || !password || !type) {
    return res
      .status(HTTP_STATUS.UnprocessableEntity)
      .send({ error: 'Missing one or more mantatory fields' });
  }
  // Create a new user object
  const newUser = {
    id: shortid.generate(),
    email: email,
    username: username,
    password: password,
    type: type,
  };

  // Set new user
  db.get('users')
    .push(newUser)
    .write();

  res.status(HTTP_STATUS.Created).send(newUser);
});

/**
 * @api {post} /api/signup Signup
 * @apiDescription User must exist on database
 * @apiGroup User
 *
 * @apiParam {String} email User email address.
 * @apiParam {String} password User password.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          "auth": true,
 *          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
 *          "user": {
 *            "email": "johnny@cash.com",
 *            "username": "Johnny Cash",
 *            "password": "123456",
 *            "type": "Customer",
 *            "id": 1
 *          }
 *      }
 *
 * @apiError BadRequest The request could not be understood by the server due to malformed syntax.
 * @apiError NotFound The server has not found anything matching the Request-URI.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Sorry, email or password not provide"
 *     }
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Sorry, invalid combination of email and password"
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "You don't have an account yet"
 *     }
 */
app.post('/api/signup', (req, res) => {
  // Get payload request
  const payload = req.body;
  // Check for empty fields
  if (!payload.email || !payload.password) {
    return res
      .status(HTTP_STATUS.BadRequest)
      .send({ error: 'Sorry, email or password not provide' });
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
      .send({ error: "You don't have an account yet" });
  }
  // Set user
  user = user[0];
  // Check user password
  if (user.password !== payload.password) {
    return res
      .status(HTTP_STATUS.BadRequest)
      .send({ error: 'Sorry, invalid combination of email and password' });
  }
  // Generate a Token
  const token = jwt.sign({ id: user.id }, SECRET_KEY, {
    expiresIn: EXPIRES_IN,
  });
  // Return a User Object with generated token
  res.status(200).send({
    auth: true,
    token: token,
    user: user,
  });
});

/*=====  End of User Register and Login  ======*/

/*=============================================
=            User Profile Actions             =
=============================================*/

/**
 * @api {post} /users/change-password Change Password
 * @apiDescription Only logged users can change their password.
 * @apiGroup Profile
 *
 * @apiParam {String} password User current password.
 * @apiParam {String} new_password User new password.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *        "Your password has changed"
 *     }
 *
 * @apiError BadRequest The request could not be understood by the server due to malformed syntax.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Your current password is invalid"
 *     }
 */
app.post('/users/change-password', (req, res) => {
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
      .send({ error: 'Your current password is invalid' });
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

/*===========  End of User Profile Actions  =========*/

/*=============================================
=                  API Settings               =
=============================================*/

/**
 * @api {post} /api/password-reset Reset Password
 * @apiDescription Reset password for non logged users.
 * @apiGroup Password
 *
 * @apiParam {String} email User email.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *        "token": "<temporary token>"
 *     }
 *
 * @apiError UnprocessableEntity The server understands the content type of the request entity but was unable to process the contained instructions.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "error": "You don't have an account yet"
 *     }
 */
app.post('/api/password-reset', (req, res) => {
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
      .send({ error: "You don't have an account yet" });
  }
  // Set User
  user = user[0];
  // Generate a temporary Token
  const token = jwt.sign({ id: user.id }, SECRET_KEY, {
    expiresIn: EXPIRES_IN,
  });
  // Save new generated Token on password resets table
  db.get('password_reset_tokens')
    .push({
      user_id: user.id,
      token: token,
    })
    .write();

  res.status(200).send({ token: token });
});

/**
 * @api {post} /api/password-reset-confirm Reset Password Confirm
 * @apiDescription Confirm Reset password using temporary token and new password.
 * @apiGroup Password
 *
 * @apiParam {String} token Temporary token generated on Reset password.
 * @apiParam {String} password User new password
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *        "Your password was reseted"
 *     }
 *
 * @apiError UnprocessableEntity The server understands the content type of the request entity but was unable to process the contained instructions.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "error": "Missing or invalid temporary Token"
 *     }
 */
app.post('/api/password-reset-confirm', (req, res) => {
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
      .send({ error: 'Missing or invalid temporary Token' });
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
app.use('/api', router);
app.set('port', process.env.PORT || 3000);
server = app.listen(app.get('port'), () => {
  console.log('Application running on port: ' + server.address().port);
});
