const express = require("express");
const app = express();
const socket = require("socket.io");
const { winCombinationsTemp } = require("./game");
const { messages } = require("./messages");

app.use(express());

const port = process.env.PORT || process.argv[2] || 3000;
const server = app.listen(
  port,
  console.log(`Server listening at port ${port}`)
);

const io = socket(server);

var players = [];
var winCombinations = winCombinationsTemp;
var board = {
  1: " 1",
  2: " 2",
  3: " 3",
  4: " 4",
  5: " 5",
  6: " 6",
  7: " 7",
  8: " 8",
  9: " 9",
};
var validKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9];
var moves = [];
let gameStatus = 0;
let no_of_moves = 0;
let temp;
var player1Move = [];
var player2Move = [];

//made connection with new players
io.on("connection", (socket) => {
  console.log("connected");

  //for a new players joining the game
  socket.on("joinGame", (playername) => {
    let id = socket.id;
    const player = { id, playername };
    if (players.length < 2) {
      players.push(player);
    } else {
      //display a Max Players message if players limit reached
      socket.emit("message", `Max players`);
    }

    temp = players.length - 1;
    if (players.length == 2 && gameStatus == 0) {
      //display a ready to play message to all Players
      io.emit("readyToPlay");
      gameStatus = 1;
    }

    //game start
    socket.on("gameStarted", () => {
      console.log("Game begins");
      //display game begins to all players
      io.emit("gameBegins");
      //display board to all players
      io.emit("printBoard", board);
      //dsiplay message to resign to other user
      socket.emit("resign");
      //player having turn
      socket.broadcast.emit("turn", "Your turn");

      if (players.length > 0) {
        if (players[0].id === socket.id) {
          temp = 0;
        } else {
          temp = 1;
        }
      } else {
        //emit to game over
        io.emit("gameOver");
      }

      //display resign opt to non turn user
      socket.on("resign", () => {
        //display board to all players
        io.emit("printBoard", board);
        socket.emit("resign");
      })

      //perform operation after user turn
      socket.on("yourTurn", (val) => {
        //check the key is valid
        let index = validKeys.findIndex((key) => key === val);
        if (index === -1) {
          if (temp === 1) {
            temp = 0;
          } else {
            temp = 1;
          }

          let turn = players[temp];
          if (turn) {
            //display board to all players
            io.emit("printBoard", board);
            //dsiplay message to resign to other user
            socket.emit("resign");
            //player having turn
            socket.emit("turn", "Invalid number, enter again");

            if (temp === 1) {
              temp = 0;
            } else {
              temp = 1;
            }
            return;
          }
        }

        //check if move already done
        let index1 = moves.findIndex((key) => key === val);
        if (index1 !== -1) {
          if (temp === 1) {
            temp = 0;
          } else {
            temp = 1;
          }

          let turn = players[temp];
          if (turn) {
            //display board to player having turn
            socket.emit("printBoard", board);
            //dsiplay message to resign to other user
            socket.emit("resign");
            //display message if key is not valid
            socket.emit("turn", "Key already used, try again");

            if (temp === 1) {
              temp = 0;
            } else {
              temp = 1;
            }
            return;
          }
        }
        moves.push(val);

        let mark;
        if (temp == 0) {
          mark = "o";
          player2Move.push(val);
        } else {
          mark = "x";
          player1Move.push(val);
        }
        board[val] = mark;

        //check the winning combination
        if (player1Move.length >= 3 || player2Move.length >= 3) {
          let count = 0;
          for (let i = 0; i < winCombinations[0].length; i++) {
            if (temp == 1) {
              for (let j = 0; j < player1Move.length; j++) {
                if (winCombinations[0][i] === player1Move[j]) {
                  count++;
                }

                if (count === 3) {
                  console.log(messages.PLAYER1_WON);
                  //display message to all players if Player 1 won
                  io.emit("gameOver", messages.PLAYER1_WON);
                  resetGame();
                }
              }
            } else {
              for (let j = 0; j < player2Move.length; j++) {
                if (winCombinations[0][i] === player2Move[j]) {
                  count++;
                }

                if (count === 3) {
                  console.log(messages.PLAYER2_WON);
                  //display message to all players if Player 2 won
                  io.emit("gameOver", messages.PLAYER2_WON);
                  resetGame();
                }
              }
            }
          }
        }

        //check number of moves
        if (no_of_moves === 8) {
          console.log("Game is tied");
          //display message to all players if game is tied
          io.emit("gameOver", "Game is tied");
          resetGame();
        }

        no_of_moves++;

        //display board to all players
        io.emit("printBoard", board);
        let turn = players[temp];
        if (turn) {
          //dsiplay message to resign to other user
          socket.emit("resign");
          //display turn message to player having turn
          socket.broadcast.to(turn.id).emit("turn", "Your turn");
        }

        if (temp === 1) {
          temp = 0;
        } else {
          temp = 1;
        }
      });
    });
  });

  //when the player exits the room
  socket.on("disconnect", () => {
    if (gameStatus === 2) {
      console.log("Game is tied");
    } else {
      let id = socket.id;
      const index = players.findIndex((player) => player.id === id);

      if (players.length > 1) {
        if (index === 0) {
          console.log(messages.PLAYER2_WON);
          //display message of Player 2 won, game is over
          io.emit("gameOver", messages.PLAYER2_WON);
        } else {
          console.log(messages.PLAYER1_WON);
          //display message of Player 1 won, game is over
          io.emit("gameOver", messages.PLAYER1_WON);
        }
      } else {
        //display message if any plyer left game before start
        console.log(`Player with id: ${id}, left the game`);
        io.emit("gameOver", messages.NO_RESULT);
      }

      if (index !== -1) {
        gameStatus = 0;
        return players.splice(index, 1)[0];
      }
    }

    socket.disconnect(true);
    resetGame();
  });
});

//reset game functionality
const resetGame = () => {
  players = [];
  board = {
    1: " 1",
    2: " 2",
    3: " 3",
    4: " 4",
    5: " 5",
    6: " 6",
    7: " 7",
    8: " 8",
    9: " 9",
  };

  gameStatus = 0;
  no_of_moves = 0;
  player1Move = [];
  player2Move = [];
  moves = [];
  return true;
};
