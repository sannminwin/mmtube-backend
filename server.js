
'use strict';

var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var google = require('googleapis');
var youtube = google.youtube('v3');
var cors = require('cors');

var apiKey = 'xxxxxxxxxxxxxxxx';
var google_myanmar_tools = require("myanmar-tools"); 
var googleTranslate = require('google-translate')(apiKey);
var rabbit = require("rabbit-node");
var detector = new google_myanmar_tools.ZawgyiDetector();

// Create express server
var app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


// Create api route for youtube search
app.get('/search', cors(), function (req, res, next) {

  // Check  whether zawgyi or unicode 
  // If it is zawgyi convert it to unicode to be able to translate in google translate
  const score = detector.getZawgyiProbability(req.query.q);
  let output = '';

  // If scroe is 1 , it is zawgyi. we will convert it to unicode
  if(score == 1) {
    output = rabbit.zg2uni(req.query.q);
  } else {
    output = req.query.q;
  }
  // Translate output string into english
  googleTranslate.translate(output, 'en', function(err, translation) {
    let translatedText = '';
    translatedText = translation.translatedText;

    // Run youtube search using output from google translate
    youtube.search.list({
      part: 'snippet',
      type: 'video',
      q: translatedText,
      auth: apiKey
    }, function (err, result) {
      if (err) {
        return next(new Error('Search error!'));
      }
      res.json(result);
    });
  });

});

// Basic error logger/handler
app.use(function (err, req, res, next) {
  res.status(500).send(err.message || 'Something broke!');
  next(err || new Error('Something broke!'));
});

if (process.env.NODE_ENV === 'production') {
  app.use(errorHandler.express);
}

if (module === require.main) {
  // Start the server
  var server = app.listen(process.env.port || 8080, function () {
    var port = server.address().port;

    console.log('App listening on port %s', port);
    console.log('Press Ctrl+C to quit.');
  });
}

module.exports = app;