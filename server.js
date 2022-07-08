const e = require('cors');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

app.use(express.static(path.join(__dirname, '/public')));

var player1 = {
    socket: null,
    position: 'cell-8-4',
    numb: 1,
    remainingWalls: 10
};
var player2 = {
    socket: null,
    position: 'cell-0-4',
    numb: 2,
    remainingWalls: 10
};
var playerTurn = null;
var placedWalls = [];

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    
    if(player1.socket == null){
        player1.socket = socket;
        console.log('player 1 connected');
    }else if(socket != player1.socket && player2.socket == null){
        player2.socket = socket;
        console.log('player 2 connected');
    }else if(socket != player1.socket && socket != player2.socket){
        console.log('socket is changing');
    }else{
        console.log('player reconnected');
    }

    if(player2.socket != null && playerTurn == null){
        playerTurn = player1;
        player1.socket.emit('change-turn', true);
        console.log("player 1's turn");
    }

    socket.on('disconnect', () => { // player disconnected
        if(socket == player1.socket){
            player1.socket = null;
            console.log('player 1 disconnected');
        }else if(socket == player2.socket){
            player2.socket = null;
            console.log('player 2 disconnected');
        }
    });

    socket.on('add-wall', function(walls){ //request to add wall
        if(socket == playerTurn.socket){
            if(playerTurn.remainingWalls > 0){
                var isPermitted = true;
                for(var i = 0; i < walls.length; i++){
                    isPermitted = isWallAvailable(walls[i]);
                }
                if(areWallsAdjacent(walls) && isPermitted){
                    placedWalls = placedWalls.concat(walls);
                    playerTurn.remainingWalls--;
                    io.emit('add-wall-confirmed', {walls: walls, player: playerTurn.numb});
                    console.log('player ' + playerTurn.numb + ' added a wall');
                    switchTurn();
                }else{
                    socket.emit('add-wall-denied', walls);
                }  
            }else{
                socket.emit('add-wall-denied', walls);
            }
        }else{
            console.log("not the player's turn");
        }
    });

    socket.on('init', function(){ // player connected
        socket.emit('init-return', {
            players: {
                _1: {
                    position: player1.position,
                    remainingWalls: player1.remainingWalls
                },
                _2: {
                    position: player2.position,
                    remainingWalls: player2.remainingWalls
                },
                iam: (socket == player1.socket)? '1' : '2'
            },
            walls: placedWalls,
            turn: (playerTurn)? playerTurn.numb : null
        });
    });

    socket.on('cell-clicked', (cell) => { //request to move player
        if(socket == playerTurn.socket){
            // var player = (socket == player1.socket)? player1 : player2;
            if(isCellAvailable(cell, playerTurn)){
                playerTurn.position = cell;
                io.emit('player-moved', {cell: cell, player: playerTurn.numb});
                isGameOver();
                switchTurn();
            }else{
                socket.emit('player-move-denied', cell);
            }
        }else{
            console.log("not the player's turn");
        }
    });

    socket.on('restart-game', function(){
        player1 = {
            socket: null,
            position: 'cell-8-4',
            numb: 1,
            remainingWalls: 10
        };
        player2 = {
            socket: null,
            position: 'cell-0-4',
            numb: 2,
            remainingWalls: 10
        };
        playerTurn = player1;
        placedWalls = [];

        io.emit('game-restarted', null);
    })

});

function switchTurn(){
    playerTurn = (playerTurn == player1)? player2 : player1;
    if(playerTurn == player1){
        player1.socket.emit('change-turn', true);
        player2.socket.emit('change-turn', false);
    }else{
        player1.socket.emit('change-turn', false);
        player2.socket.emit('change-turn', true);
    }
}

function areWallsAdjacent(walls){
    var wall1_id = walls[0].split('-');
    var wall2_id = walls[1].split('-');
    var wall1_coords = {
        o: wall1_id[1],
        x: wall1_id[2],
        y: wall1_id[3]
    }
    var wall2_coords = {
        o: wall2_id[1],
        x: wall2_id[2],
        y: wall2_id[3]
    }

    if(wall1_coords.o != wall2_coords.o){
        return false;
    }

    if(wall1_coords.o == 'h'){
        if(wall1_coords.x != wall2_coords.x){
            return false;
        }
        if(wall1_coords.y != (wall2_coords.y - 1) && wall1_coords.y != (parseInt(wall2_coords.y) +1)){
            return false;
        }
    }else{
        if(wall1_coords.y != wall2_coords.y){
            return false;
        }
        if(wall1_coords.x != (wall2_coords.x -1) && wall1_coords.x != (parseInt(wall2_coords.x) +1)){
            return false;
        }
    }
    return true;
}

function isWallAvailable(wall){
    for(var i = 0; i < placedWalls.length; i++){
        if(wall == placedWalls[i]){
            return false;
        }
    }
    return true;
}

function isCellAvailable(cell, player){
    if(cell == player1.position || cell == player2.position){
        return false;
    }
    var cell_id = cell.split('-');
    var cell_coords = {
        x: cell_id[1],
        y: cell_id[2]
    };

    var player_id = player.position.split('-');
    var player_coords = {
        x: player_id[1],
        y: player_id[2]
    }
    var dash_id;
    if(cell_coords.x == (player_coords.x - 1) && cell_coords.y == player_coords.y){ // up
        dash_id = 'dash-h-' + player_coords.x + '-' + player_coords.y;
    }else if(cell_coords.x == (parseInt(player_coords.x) + 1) && cell_coords.y == player_coords.y){ // down
        dash_id = 'dash-h-' + (parseInt(player_coords.x) + 1) + '-' + player_coords.y;
    }else if(cell_coords.x == player_coords.x && cell_coords.y == (player_coords.y - 1)){ // left
        dash_id = 'dash-v-' + player_coords.x + '-' + player_coords.y;
    }else if(cell_coords.x == player_coords.x && cell_coords.y == (parseInt(player_coords.y) + 1)){ // right
        dash_id = 'dash-v-' + player_coords.x + '-' + (parseInt(player_coords.y) + 1);
    }else{
        return false;
    }
    return !isDashWall(dash_id);
}

function isDashWall(dash){
    for(var i = 0; i < placedWalls.length; i++){
        if(dash == placedWalls[i]){
            return true;
        }
    }
    return false;
}

function isGameOver(){
    // win if a player reaches last row facing
    if(player1.position.includes('cell-0')){
        io.emit('game-over', '1');
    }
    if(player2.position.includes('cell-8')){
        io.emit('game-over', '2');
    }
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});