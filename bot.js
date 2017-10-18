//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";

// set up db
const Mongoose = require('mongoose');
Mongoose.connect(process.env.DB_CONNECTION);
const db = Mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error'));
db.once('open', () => { console.log('Connection with database succeeded'); });

const Handlers = require('./all/handlers');
const User = require('./all/users-model');
const Post = require('./all/posts-model');

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  // if (req.query['hub.mode'] === 'subscribe' &&
  //     req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
  //   console.log("Validating webhook");
  res.status(200).send(req.query['hub.challenge']);
  // } else {
  //   console.error("Failed validation. Make sure the validation tokens match.");
  //   res.sendStatus(403);          
  // }
});

app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

function isNumeric(num) {
  return !isNaN(num)
}

// Incoming events handling
async function receivedMessage(event) {
  var senderId = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderId, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  // look for user, if new user, create new user
  let user = await Handlers.getUser(senderId);
  if (user == "BAD") {
    user = await Handlers.createNewUser(senderId);
    if (user == "BAD") {
      sendTextMessage(senderID, "WE GOT PROBLEMS... TELL JOHN!");      
    }
  }

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;
  let messageText2 = messageText.split(" ");  

  if (messageText.length == 1 && (messageText.toLowerCase() == "q" || messageText.toLowerCase() == "l")) {
    if (messageText.toLowerCase() == "q") {
      sendTextMessage(user.uid, specialMessage(user.queue, "QUEUE"))      
    }
    if (messageText.toLowerCase() == "l") {
      sendTextMessage(user.uid, specialMessage(user.list, "LIST"))      
    }
  }

  else if (messageText == "heisenough") {
    User.find({}, (err, users) => {
      if (err) {
          return "BAD";
      }
      for (let user of users) {
        sendTextMessage(user.uid, specialMessage(user.list, "LIST"))        
      };
    });
  }

  else if (messageText.length == 1 && isNumeric(messageText) && +messageText < user.queue.length) {
    let number = +messageText;    
    user.list.push(user.queue.splice(number, 1)[0]);
    user.save((err, user) => {
      sendTextMessage(user.uid, specialMessage(user.list, "LIST"))
    });
  }

  else if (messageText2.length == 2 && messageText2[0].toLowerCase() == "done") {
    let option = messageText2[0];
    let numeral = messageText2[1];
    let number = +numeral;
    if (isNumeric(numeral)) {
      if (number < user.list.length) {
        user.list.splice(number, 1);
        user.save((err, user) => {
          sendTextMessage(user.uid, specialMessage(user.list, "LIST"))
        });    
      }
    }
  }

  else {
    let post = new Post({
      uid: senderId,
      prayer: messageText
    });
    post.save((err, post) => {
        if (err) {
          return "BAD";
        } else {
          User.find({}, (err, users) => {
              if (err) {
                  return "BAD";
              }
              for (let user of users) {
                user.queue.push(post);
                user.save((err, user) => {
                  sendTextMessage(user.uid, specialMessage(user.queue, "QUEUE"))
                });
              };
          });
        }
    });
  }
}

function specialMessage(queue, type) {
  let message = type;
  message += "\n";  
  queue.forEach(function (item, i) {
    message += i + ". ";
    message += item.prayer;
    message += "\n";
  });
  return message;
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});
