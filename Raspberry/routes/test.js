var express = require ('express');
var testController = require('../Controller/prueba_test');

var app = express.Router();

app.get('/prueba_test', testController.prueba_test);

module.exports = app;