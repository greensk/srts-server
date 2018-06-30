var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
});
server.listen(1337, function() { });
let clients = [];

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);
  clients.push({connection, name: '', status: 'connected'})
  console.log('add client')

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      const messageData = JSON.parse(message.utf8Data)
      console.log(messageData)
      clients.forEach((client) => {
        if (client.connection !== connection && messageData.type !== 'unitsEnergyUpdate') {
          client.connection.sendUTF(message.utf8Data)
        }
      })
    }
  });

  connection.on('close', function(connection) {
    // close user connection
    clients = clients.filter(c => c.connection !== connection)
    console.log('remove client')
  });
});
