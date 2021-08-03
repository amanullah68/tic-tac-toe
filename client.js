const io = require("socket.io-client");
const readcommand = require("readcommand");
const { printBoard } = require("./game");

const server =
  process.env.SERVER ||
  `http://${process.argv[2]}:${process.argv[3]}` ||
  "http://127.0.0.1:3000";

//connect with server
const socket = io(server);

//on successfull connection
socket.on("connect", () => {
  console.log(`connected to ${server}`);
  let playerName;
  console.log("Enter your name");

  //read username from command prompt
  readcommand.read(function (err, args) {
    playerName = args[0];
    console.log("Your name is", playerName);

    socket.emit("joinGame", playerName);

    socket.on("message", (msg) => {
      console.log(msg);
    });

    // ready to start the game
    socket.on("readyToPlay", () => {
      console.log("Press any key to start the game");
      readcommand.read(function (err, args) {
        console.log("Arguments: %s", args[0]);

        if (args[0] === "r") {
          socket.disconnect();
        }

        // game will be started
        socket.emit("gameStarted");
        socket.on("gameBegins", () => {
          console.log("Game Begins");
          socket.on("printBoard", (board) => {
            printBoard(board);
          });
        });

        // players turn
        socket.on("turn", (val) => {
          console.log(val);
          // read values from command line
          readcommand.read(function (err, args) {
            console.log("Arguments: %s", args[0]);
            if (args[0] === "r") {
              socket.disconnect();
            }

            socket.emit("yourTurn", Number(args[0]));
          });
        });

        // players turn
        socket.on("resign", () => {
          console.log("Press 'r' to winthdraw from game");
          // read values from command line
          readcommand.read(function (err, args) {
            console.log("Arguments: %s", args[0]);
            if (args[0] === "r") {
              socket.disconnect();
            }

            socket.emit("resign");
          });
        });

        // game over
        socket.on("gameOver", (msg) => {
          console.log(msg);
          socket.disconnect();
        });
      });
    });
  });
});
