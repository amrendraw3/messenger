var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require("redis"),
		subscriber = redis.createClient(),
  	publisher  = redis.createClient();
  	
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on('transferdata', function(msg){
  	publisher.publish("transferdata", msg);
   	io.emit('transferdata', msg);
  });
});

subscriber.on("message", function(channel, message) {
  console.log("Message '", message, "' on channel '" + channel + "' arrived!")
});

subscriber.subscribe("transferdata");

http.listen(3000, function(){
  console.log('listening on *:3000');
});