<h1 align="center">
NewAeonServer Restful API
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

Go to http://localhost:3000/api/register

POST:

```json
{
   "username":"Jhonny Cash",
   "email": "jhonny@example.com",
   "password": "123456",
   "type": "Admin"
}
```

To see all the methods available go to: http://localhost:3000/apidoc/

# License
MIT