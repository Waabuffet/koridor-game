# Koridor Game

This is the Koridor board game coded in nodejs using socket.io to add ability for multiplayer over LAN.

## Requirements
- Nodejs
- Npm

## Installation

```
npm install
```

## How to play

Open the appp in the browser on 2 machines on the same network.
As soon as the second player loads, the game starts.

You can either move your player by clicking on a cell next to your player character, or you can place a wall by clicking on 2 dashes adjacent to each other.

Once you do one of these moves, it's the next player's turn

## Game Rules

The player who reaches the other side wins. Your goal is block the other player from reaching it before you.
You can place walls to divert his path but you are not allowed to block his path completely