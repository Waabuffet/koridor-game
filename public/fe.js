var isMyTurn = false;
var dash_clicked = null;

var board = {
    players: {
        _1: null,
        _2: null,
        iam : null
    },
    walls: [],
    turn: false
}

document.onload = function(){
    initBoard();
}

var socket = io();

socket.on('init-return', function(board_ongoing){
    board = board_ongoing;
    console.log(board_ongoing)
    console.log('you are player ' + board.players.iam);
    document.getElementById('which_player').innerText = board.players.iam;
    isMyTurn = (board.players.iam == board.turn);
    if(board.turn){
        document.getElementById('which_turn').innerText = board.turn;
    }
    placeBoard();
});

socket.on('change-turn', function(myTurn){
    isMyTurn = myTurn;
    if(isMyTurn){
        console.log('it is your turn');
    }else{
        console.log('it is other player turn');
    }
    board.turn = (board.turn == 1)? 2 : 1;
    document.getElementById('which_turn').innerText = board.turn;
});

socket.on('player-moved', function(msg){
    replacePlayer(board.players['_' + msg.player].position, msg.cell, msg.player);
    board.players['_' + msg.player].position = msg.cell;
});

socket.on('player-move-denied', function(cell){
    console.log('server denied player move');
})

socket.on('add-wall-confirmed', function(msg){
    for(var i = 0; i < msg.walls.length; i++){
        document.getElementById(msg.walls[i]).classList.add('wall');
    }
    if(dash_clicked){
        document.getElementById(dash_clicked).classList.remove('selected-dash');
    }
    board.walls = board.walls.concat(msg.walls);
    board.players['_' + msg.player].remainingWalls--;
    document.getElementById('player' + msg.player + '_walls').innerText = board.players['_' + msg.player].remainingWalls;
    dash_clicked = null;
});

socket.on('game-over', function(winner){
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('restart-game').style.display = 'block';
    document.getElementById('winner').innerText = winner;

    document.querySelectorAll('td').forEach(element => {
        element.removeEventListener('click', clickedSomething);
    });
});

socket.on('add-walls-denied', function(walls){
    dash_clicked = null;
    for(var i = 0; i < walls.length; i++){
        document.getElementById(walls[i]).classList.remove('selected-dash');
    }
});

socket.on('game-restarted', function(){
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('restart-game').style.display = 'none';
    initBoard();
});

function initBoard(){
    var counter = 0;
    var board = document.getElementById('board');
    board.innerHTML = '';
    function getDashes(row_num){
        var row = document.createElement('tr');

        for(var i = 0; i < 9; i++){
            var td_o = document.createElement('td');
            td_o.className = 'o';
            row.appendChild(td_o);

            var td_dash = document.createElement('td');
            td_dash.className = 'dash_h';
            td_dash.id = 'dash-h-' + row_num + '-' + i;
            if(row_num != 0 && row_num != 9){
                td_dash.classList.add('available-dash');
            }
            td_dash.addEventListener('click', clickedSomething);
            row.appendChild(td_dash);
        }
        var td_o = document.createElement('td');
        td_o.className = 'o';
        row.appendChild(td_o);
        return row;
    }

    function getCells(row_num){
        var row = document.createElement('tr');

        for(var i = 0; i < 9; i++){
            var td_dash = document.createElement('td');
            td_dash.className = 'dash_v';
            if(i != 0){
                td_dash.classList.add('available-dash');
            }
            td_dash.id = 'dash-v-' + row_num + '-' + i;
            td_dash.addEventListener('click', clickedSomething);
            row.appendChild(td_dash);

            var td_cell = document.createElement('td');
            td_cell.className = 'cell available-cell';
            td_cell.id = 'cell-' + row_num + '-' + i;
            td_cell.addEventListener('click', clickedSomething);
            row.appendChild(td_cell);
        }
        var td_dash = document.createElement('td');
        td_dash.className = 'dash_v';
        td_dash.id = 'dash-v-' + row_num + '-' + 9;
        td_dash.addEventListener('click', clickedSomething);
        row.appendChild(td_dash);

        return row;
    }
    
    for(var i = 0; i < 9; i++){
        board.appendChild(getDashes(i));
        board.appendChild(getCells(i));
    }
    board.appendChild(getDashes(9));

    socket.emit('init', null);
}

function placeBoard(){
    console.log('placing board');
    
    // players
    replacePlayer(null, board.players._1.position, '1');
    replacePlayer(null, board.players._2.position, '2');

    for(var i = 0; i < board.walls.length; i++){
        document.getElementById(board.walls[i]).classList.add('wall');
    }

    document.getElementById('player1_walls').innerText = board.players._1.remainingWalls;
    document.getElementById('player2_walls').innerText = board.players._2.remainingWalls;

    console.log('finished placing board');
}

function getCoords(id){
    // row is y, col is x row_y-col_x
    var id_parts = id.split('-');
    return {
        y: id_parts[0].split('_')[1],
        x: id_parts[1].split('_')[1]
    }
}

function clickedSomething(something){
    if(isMyTurn){
        var id = something.srcElement.id;
        console.log('clicked: ' + id);
        if(id.split('-')[0] == 'cell'){ // player
            if(dash_clicked){
                document.getElementById(dash_clicked).classList.remove('selected-dash');
                dash_clicked = null;
            }
            if(isCellAvailable(id)){
                socket.emit('cell-clicked', id);
            }else{
                console.log('move not allowed');
            }
        }else if(id.split('-')[0] == 'player'){
            something.srcElement.parentElement.click();
        }else if(board.players['_' + board.players.iam].remainingWalls > 0){ // wall
            if(isWallAvailable(id)){
                if(dash_clicked == null){
                    dash_clicked = id;
                    document.getElementById(id).classList.add('selected-dash');
                }else if(isDashAdjacent(id)){
                    socket.emit('add-wall', [dash_clicked, id]);
                }else if(id == dash_clicked){
                    document.getElementById(dash_clicked).classList.remove('selected-dash');
                    dash_clicked = null;
                }else{
                    document.getElementById(dash_clicked).classList.remove('selected-dash');
                    dash_clicked = id;
                    document.getElementById(id).classList.add('selected-dash');
                }
            }
        }
    }else{
        console.log('please wait for your turn');
    }
}

function isDashAdjacent(dash){
    if(dash_clicked || (dash_clicked == dash)){
        var clicked_id_parts = dash_clicked.split('-');
        var new_id_parts = dash.split('-');

        if(clicked_id_parts[1] == new_id_parts[1]){
            if(clicked_id_parts[1] == 'h'){
                if(clicked_id_parts[2] == new_id_parts[2]){
                    var clicked_y = clicked_id_parts[3];
                    var new_y = new_id_parts[3];

                    if(new_y == (clicked_y - 1) || new_y == (parseInt(clicked_y) +1)){
                        return true;
                    }else{
                        return false; //more distant
                    }
                }else{
                    return false; //not same row
                }
            }else{
                if(clicked_id_parts[3] == new_id_parts[3]){
                    var clicked_x = clicked_id_parts[2];
                    var new_x = new_id_parts[2];

                    if(new_x == (clicked_x - 1) || new_x == (parseInt(clicked_x) +1)){
                        return true;
                    }else{
                        return false; //more distant
                    }
                }else{
                    return false; //not same column
                }
            }
        }else{
            return false; // on is horizontal other is vertical
        }
        
    }
    return false; //should reach here only if clicked on same dash
}

function isDashWall(dash){
    for(var i = 0; i < board.walls.length; i++){
        if(dash == board.walls[i]){
            console.log('dash is wall');
            return true;
        }
    }
    return false;
}

function isWallAvailable(wall){
    for(var i = 0; i < board.walls.length; i++){
        if(wall == board.walls[i]){
            return false;
        }
    }
    return true;
}

function replacePlayer(oldPos, newPos, playerNumb){
    if(oldPos){
        document.getElementById(oldPos).innerHTML = '';
        document.getElementById(oldPos).classList.add('available-cell');
    }
    var cell = document.getElementById(newPos);
    var div = document.createElement('div');
    div.className = 'a-player player-' + playerNumb;
    div.id = 'player-' + playerNumb;
    cell.classList.remove('available-cell');
    cell.appendChild(div);
}

function isCellAvailable(cell){
    if(cell == board.players._1.position || cell == board.players._2.position){
        return false;
    }
    var cell_id = cell.split('-');
    var cell_coords = {
        x: cell_id[1],
        y: cell_id[2]
    };

    var player_id = board.players['_' + board.players.iam].position.split('-');
    var player_coords = {
        x: player_id[1],
        y: player_id[2]
    }
    console.log(cell_coords, player_coords);
    var dash_id;
    if(cell_coords.x == (player_coords.x - 1) && cell_coords.y == player_coords.y){ // up
        console.log('trying to move up');
        dash_id = 'dash-h-' + player_coords.x + '-' + player_coords.y;
    }else if(cell_coords.x == (parseInt(player_coords.x) + 1) && cell_coords.y == player_coords.y){ // down
        console.log('trying to move down');
        dash_id = 'dash-h-' + (parseInt(player_coords.x) + 1) + '-' + player_coords.y;
    }else if(cell_coords.x == player_coords.x && cell_coords.y == (player_coords.y - 1)){ // left
        console.log('trying to move left');
        dash_id = 'dash-v-' + player_coords.x + '-' + player_coords.y;
    }else if(cell_coords.x == player_coords.x && cell_coords.y == (parseInt(player_coords.y) + 1)){ // right
        console.log('trying to move right');
        dash_id = 'dash-v-' + player_coords.x + '-' + (parseInt(player_coords.y) + 1);
    }else{
        return false;
    }
    return !isDashWall(dash_id);
}

function restartGame(){
    socket.emit('restart-game', null);
}

initBoard();