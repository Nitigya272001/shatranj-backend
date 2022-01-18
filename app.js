const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)

const socketio = require('socket.io')
const io = socketio(server, {cors:{origin:"*"}})
const cors = require('cors');
app.use(cors());
const port = process.env.PORT || 3003


const clientRooms = {};

io.on('connection', (client) => {

    console.log("id", client.id)
    client.on("createNewGame", createNewGame)
    client.on("playerJoinGame", playerJoinsGame)
    client.on('reStartNewGame', handleReStartNewGame)
    client.on("validMove", handleValidMove)
    client.on('promoteMove', handlePromoteMove);
    client.on('callUser', handleCallUser);
    client.on('acceptCall',handleAcceptCall);
    client.on("disconnect", handleDisconnect)

    function createNewGame(gameId) {
        clientRooms[client.id] = gameId
        // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
        // Join the Room and wait for the other player
        client.join(gameId)
        client.emit('init', {gameId: gameId, mySocketId: client.id, playerNumber : 1});
    }
    
    function playerJoinsGame(idData) {
        var room = io.sockets.adapter.rooms.get(idData.gameId)

        if (room===undefined || room.size === 0) {
            client.emit('status' , "This game session does not exist." );
            return
        } else if (room.size === 1) {
            idData.mySocketId = client.id;
            client.join(idData.gameId);
            clientRooms[client.id] = idData.gameId;
    
            client.emit('init', {gameId: idData.gameId, mySocketId: client.id, playerNumber : 2});
            io.sockets.in(idData.gameId).emit('playerJoinedRoom', idData);
        } else {
            client.emit('status' , "There are already 2 people playing in this room." );
            return;
        }
    }
    
    function handleCallUser(data) {
        io.to(data.userToCall).emit('hey', {signal: data.signal, from: data.from});
    }
    
    function handleAcceptCall(data) {
        io.to(data.to).emit('callAccepted', {signal: data.signal, id: client.id});
    }
    
    function handleValidMove(positionObject) {
        io.sockets.in(positionObject.roomName).emit('movePieces',positionObject)
    }
    
    function  handleReStartNewGame(detailsObject) {
        io.sockets.in(detailsObject.roomName).emit('resetGame', detailsObject.playerNumber)
    }
    
    function handlePromoteMove(detailsObject) {
        client.broadcast.emit('validPromoteMove',detailsObject)
    }
    
    function handleDisconnect() {
        console.log(client.id, "disconnected")
        const roomName = clientRooms[client.id]
        delete clientRooms[client.id]
        io.sockets.in(roomName).emit('opponentDisconnected')
    }
})

server.listen(port, ()=> {
    console.log(`Server is live at ${port}`)
})
