<h1 align="center">
JWT NewAeonServer Restful API
</h1>

<h3 align="center">Fake back-end Restful API powered by JsonWebToken, Json-Server and ApiDoc.<h3>

<p align="center">
  <img width="800" height="449" src="./public/assets/newaeonserver.png">
</p>

<p align="center">
A small deadly simple server, including endpoints to: Signup, Login, Refresh Token, Chance Profile Password, Reset Password and User Roles.
</p>

# How to use
Download or clone the repository.

Install dependencies:
```JavaScript
npm install
```
Running the App:
```JavaScript
npm start
```

(Optimal)To generate new API document:
```JavaScript
npm run docs
```

# Create a new user

POST: to http://localhost:3000/api/register

```json
{
   "username":"Jhonny Cash",
   "email": "jhonny@example.com",
   "password": "123456",
   "type": "Admin"
}
```

To see more details available go to: http://localhost:3000/apidoc/#api-User-PostApiRegister

# Login user

POST: to http://localhost:3000/api/signup

```json
{
   "email": "jhonny@example.com",
   "password": "123456"
}
```

To see more details available go to: http://localhost:3000/apidoc/#api-User-PostApiSignup

# How the API works

All endpoints created by the **Json-Server** database file (`db.json`) are protected by **token authentication**, this means that you must be logged in with a valid user and must use the following header:

```json
{
    "Authorization": "Bearer <token>"
}
```

You receive this token in the success of the login endpoint, according to the following object:

```json
{
     "auth": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR...",
     "user": {
       "email": "johnny@cash.com",
       "username": "Johnny Cash",
       "password": "123456",
       "type": "Amin",
       "id": 1
     }
 }

```

# Adding your own endpoints

It is very easy to add new endpoints, you can create them in the **Json-Server** database file: `db.json`, simply by adding new objects, you can read more about it [here](https://github.com/typicode/json-server).

# Why use this project?

If you need to create **prototypes quickly** and unplugged for your front-end application, or you need to develop proof of concept about some Restful application, this project is for you.
Since we have here common things in every application such as user authentication, login, signup, change password among other things.

# License
MIT