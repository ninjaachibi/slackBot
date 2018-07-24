const bodyParser = require('body-parser')
const path = require('path')

const slack = require('./slack')
//mongoose
const mongoose = require('mongoose');

//server Set Up
const express = require('express')
const app = express();
const http = require('http')

function handleRequest(request, response) {
  response.end('Ngrok is working! - Path Hit: ' + request.url);
}

const server = http.Server(handleRequest)

app.use(express.static(path.join(__dirname, 'build')))
app.use(bodyParser.json());

//Test-Route
app.get('/ping', (req, res) => {
  res.send('pong')
})

app.post('/response', (req, res) => {
  console.log('---------------TEST------------');
  res.json(req)
})


//Do Not Touch This Bottom Part
server.listen(process.env.port || 3000, () => {console.log('listening on port 3000') });

console.log('Server running at http://127.0.0.1:3000/')
