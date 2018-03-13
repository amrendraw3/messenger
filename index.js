var app 			      = require('express')(),
    http            = require('http').Server(app),
    io              = require('socket.io')(http),
    redis           = require("redis"),
    redisSubscriber = redis.createClient(),
    redisPublisher  = redis.createClient(),
    clients         = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Handle socket connection, event listeners and emitters
io.on('connection', function(socket){ // User is connected
  
  // Handle disconnect event of a connected user
  socket.on('disconnect', function(){
    for(var uniqueId in clients) {
      if(clients[uniqueId].socket === socket.id) { // Remove from connected users/sockets list
        delete clients[uniqueId];
        break;
      }
    }
  });

  // Add user to internal connected user's management
  socket.on('add-user', function(data){
    clients[data.uniqueId] = {
      "socket": socket.id
    };
  });

  // Handle transfer data event, passed from front-end connected socket
  socket.on('transferdata', function(msg){
    // Write database logic here and publish event from redis
    redisPublisher.publish("transferdata", JSON.stringify(msg));
  });

  // Handle transfer data event to personal level, passed from front-end connected socket
  socket.on('personaldata', function(msg){
    if(!!msg.uniqueId) {
      redisPublisher.publish("personaldata", JSON.stringify(msg));
    }
  });
});

// Handle all publish messages on subscribed channel from redis
redisSubscriber.on("message", function(channel, message) {
  var message = JSON.parse(message);
  if(channel === "transferdata") { // public event
    io.emit('generalData', message);
  }

  if(channel === "personaldata") { // personal event
    if (clients[message.uniqueId]){
      io.sockets.connected[clients[message.uniqueId].socket].emit("personalData", message);
    } else {
      console.error('User with unique id ' + message.uniqueId + ' does not exist!');
    }
  }
});

// Subscribe redis events
redisSubscriber.subscribe("transferdata");
redisSubscriber.subscribe("personaldata");

// Start HTTP server
http.listen(3000, function(){
  console.log('Server is up and running at http://localhost:3000')
});