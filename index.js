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
    if (message.type !== 'utf8') {
      return
    }
    const messageData = JSON.parse(message.utf8Data)
    const payload = messageData.payload ? messageData.payload : {}
    const client = clients.find(c => c.connection === connection)
    console.log(messageData)
    if (messageData.type === 'setPlayerName') {
      const name = payload.name.toString()
      client.name = name
      client.status = 'wait'
      console.log(`set name=${name} for user ud=${id}`)
      sendGames(client)
      return
    }
    if (messageData.type === 'createGame') {
      const gameid = genid()
      games.push({
        id: gameid,
        owner: client.id,
        status: 'waiting',
        requests: [],
        name: client.name
      })
      client.status = 'owner'
      console.log(`create a new game name=${client.name} gameid=${gameid}`)
      sendGames()
      return
    }
    if (messageData.type === 'joinGame') {
      const gameid = payload.game
      const gameObject = games.find(g => g.id === gameid)
      if (gameObject) {
        gameObject.requests.push({ name: client.name, id: client.id })
        const owner = clients.find(c => c.id === gameObject.owner)
        const message = {
          type: 'setGameRequests',
          payload: {
            list: gameObject.requests
          }
        }
        owner.connection.sendUTF(JSON.stringify(message))
      }
      return
    }
    if (messageData.type === 'startGame') {
      const gameObject = games.find(g => g.owner === client.id)
      if (gameObject) {
        client.game = gameObject.id
        console.log(`add user id = ${client.id} to game id=${gameObject.id}`)
        clients.forEach((currentClient) => {
          if (currentClient.id === payload.clientId) {
            currentClient.game = gameObject.id
            console.log(`add user id = ${currentClient.id} to game id=${gameObject.id}`)
            const message = {
              type: 'startGame',
              payload: {}
            }
            currentClient.connection.sendUTF(JSON.stringify(message))
            console.log('start game')
          }
        })
        gameObject.status = 'started'
      }
      return
    }
    if (messageData.type === 'unitsEnergyUpdate') {
      return
    }
    // rest actions
    clients.forEach((currentClient) => {
      if (currentClient.connection !== connection && currentClient.game === client.game) {
        console.log(`propogate action to ${currentClient.id}`)
        currentClient.connection.sendUTF(message.utf8Data)
      }
    })
  })

  connection.on('close', function(reason) {
    // close user connection
    const clientToRemove = clients.find(c => c.connection === connection)
    console.log(`remove user ${clientToRemove.id}`)
    console.log(games)
    const gameToRemove = games.find(g => g.owner === clientToRemove.id)
    clients = clients.filter(c => c !== clientToRemove)
    if (gameToRemove) {
      console.log(`remove game ${gameToRemove.id}`)
      clients.forEach((client) => {
        if (client.game === gameToRemove.id) {
          client.connection.close()
          console.log(`removed game id=${gameToRemove.id}`)
        }
      })
      games = games.filter(g => g !== gameToRemove)
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
          games: games.filter(g => g.status === 'waiting').map(g => ({ name: g.name, id: g.id })) 
        }
      }
      client.connection.sendUTF(JSON.stringify(message))
    }
  })
}