var WebSocketServer = require('websocket').server
var http = require('http')
var genid = require('./genid.js')

var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
})
server.listen(1337, function() { })
let clients = []
let games = []

// create the server
wsServer = new WebSocketServer({
  httpServer: server
})

// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin)
  const id = genid()
  clients.push({
    id,
    connection,
    name: '',
    status: 'connected',
    game: null
  })
  console.log(`add user ${id}`)

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      const messageData = JSON.parse(message.utf8Data)
      const payload = messageData.payload ? messageData.payload : {}
      console.log(messageData)
      clients.forEach((client) => {
        if (messageData.type === 'setPlayerName') {
          const name = payload.name.toString()
          if (client.connection === connection) {
            client.name = name
            client.status = 'wait'
            console.log(`set name=${name} for user ud=${id}`)
            sendGames(client)
          }
          return
        }
        if (messageData.type === 'createGame') {
          if (client.connection === connection) {
            const gameid = genid()
            games.push({
              id: gameid,
              owner: client.id,
              name: client.name
            })
            client.status = 'owner'
            console.log(`create a new game name=${client.name} gameid=${gameid}`)
            sendGames()
          }
          return
        }
        if (client.connection === connection) {
          return
        }
        if (messageData.type === 'unitsEnergyUpdate') {
          return
        }
        client.connection.sendUTF(message.utf8Data)
      })
    }
  })

  connection.on('close', function(reason) {
    // close user connection
    const clientToRemove = clients.find(c => c.connection === connection)
    console.log(`remove user ${clientToRemove.id}`)
    const gameToRemove = games.find(g => g.owner === clientToRemove)
    clients = clients.filter(c => c !== clientToRemove)
    if (gameToRemove) {
      clients.forEach((client) => {
        if (client.game === gameToRemove.id) {
          client.connection.close()
          console.log(`remove game id=${gameToRemove.id}`)
        }
      })
    }
  })
})

function sendGames (onlyClient) {
  clients.forEach((client) => {
    if (onlyClient && onlyClient !== client) {
      return
    }
    if (client.status === 'wait' || client.status === 'connected') {
      console.log(`send games list user name=${client.name} id=${client.id}`)
      const message = {
        type: 'setGamesList',
        payload: {
          games: games.map(g => ({ name: g.name, id: g.id })) 
        }
      }
      client.connection.sendUTF(JSON.stringify(message))
    }
  })
}