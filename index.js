var app 			 = require('express')(),
		http       = require('http').Server(app),
		io         = require('socket.io')(http),
		redis      = require("redis"),
		subscriber = redis.createClient(),
		publisher  = redis.createClient(),
		clients    = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  
  socket.on('disconnect', function(){
    console.log('user disconnected');
    for(var uniqueId in clients) {
      if(clients[uniqueId].socket === socket.id) {
        console.log('Removing client id: ', uniqueId);
        delete clients[uniqueId];
        break;
      }
    }
  });

  socket.on('add-user', function(data){
    clients[data.uniqueId] = {
      "socket": socket.id
    };
    console.log("clients", clients);
  });

  socket.on('transferdata', function(msg){
    // Write database logic here and publish event from redis
  	console.log('msg: ', msg);
    publisher.publish("transferdata", JSON.stringify(msg));
  });

  socket.on('personaldata', function(msg){
    console.log('msg: ', msg);
    if(!!msg.uniqueId) {
      publisher.publish("personaldata", JSON.stringify(msg));
    }
    // io.emit('transferdata', msg);
  });
});

// Handle all publish messages on subscribed channel from redis
subscriber.on("message", function(channel, message) {
  console.log("Message '", JSON.parse(message), "' on channel '" + channel + "' arrived!")
  var message = JSON.parse(message);
  if(channel === "transferdata") { // public event
    console.log('Publishing public event!');
    io.emit('generalData', message);
  }

  if(channel === "personaldata") { // personal event
    console.log('TODO: Publishing user-level event!');
    if (clients[message.uniqueId]){
      io.sockets.connected[clients[message.uniqueId].socket].emit("personalData", message);
    } else {
      console.log("User does not exist: " + message.uniqueId); 
    }
  }
 });

subscriber.subscribe("transferdata");
subscriber.subscribe("personaldata");

http.listen(3000, function(){
  console.log('listening on *:3000');
});