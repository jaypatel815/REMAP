const pg = require("pg");
// import the Express module
const express = require("express");
// create a new instance of Express
const app = express();
// https://www.npmjs.com/package/uuid
const { v4: uuidv4 } = require('uuid');

// set-up a connection between the client and the server
const http = require("http").Server(app);
const io = require("socket.io")(http);

// use "public_html" directory for static files
app.use(express.static("public_html"));

// imports database environment variables
const env = require("./env.json");

const Pool = pg.Pool;
const pool = new Pool(env);
pool.connect().then(function () {
    console.log(`Connected to database ${env.database}`);
});

// global variables to store the rooms and game states
let rooms = new Set();
let games = {};

// function to generate a 5 letter unique game code
function generateGameCode() {
    let gameCode = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let charLength = characters.length;
    do {
        for (let i = 0; i < 5; i++) {
            gameCode += characters.charAt(Math.floor(Math.random() * charLength));
        }
    } while (rooms.has(gameCode));
    
    return gameCode;
}

// ---------------Function that assigns new words----------------
// function to assign a unique word to specified room
async function assignWord(roomName) {
    return new Promise((resolve, reject) => {
        let idx = Math.floor(Math.random() * 5758) + 1;
        let word;
        pool.query(
            `SELECT word FROM words WHERE id=$1 AND ($2=ANY(used)) IS NOT TRUE;`,
            [idx, roomName]
        ).then(function (response) {
            if (response.rows.length) {
                console.log(`Assigned "${response.rows[0].word}" to room "${roomName}"`);
                word = response.rows[0].word;
                pool.query(
                    `UPDATE words SET used = array_append(used, $2) WHERE id=$1`,
                    [idx, roomName]).then(function (response) {
                        console.log(`Added room name to the used column of the word "${word}"`);
                        resolve(word);
                    }).catch(function (error) {
                        console.log("Couln't add room name to the used column");
                    });
            } else {
                console.log('Already used!');
                assignWord(roomName);
            }
        }).catch(function (error) {
            console.log(error);
            assignWord(roomName);
        });
    });
}

// const answer = "lapse"; // hardcoded for now
// ---- Now a random word is assigned to each room, and a new one would be reassigned if they play again
let answer = {};
let again = {};

// handle incoming connections from clients
io.on("connection", socket => {
    console.log("A user connected with id: " + socket.id);

    const gameId = socket.handshake.query.gameId;
    const playerId = socket.handshake.query.playerId;

    socket.on('new game', () => {
        const gameId = generateGameCode(5);
        rooms.add(gameId);
        const game = {
            players: []
        };
        const playerId = uuidv4();
        game.players.push(playerId);
        games[gameId] = game;

        io.to(socket.id).emit('game created', {gameId: gameId, playerId: playerId});

        socket.join(gameId);

        console.log("A new game room created with id: " + gameId);
    });

    socket.on('join game', (gameId) => {
        if (games.hasOwnProperty(gameId) && games[gameId].players.length === 1) {
            const game = games[gameId];
            const playerId = uuidv4();
            game.players.push(playerId);

            io.to(socket.id).emit('game joined', {gameId: gameId, playerId: playerId});

            socket.join(gameId);

            io.in(gameId).emit("start game");
            assignWord(`${gameId}`).then(function (result) {
                answer[`${gameId}`] = result;
            });
            again[`${gameId}`] = 0;
        } else {
            io.to(socket.id).emit('failed to join game');
        }
    });

    // handles room placement when clients disconnect and reconnect with a different socket id
    if (games.hasOwnProperty(gameId) && games[gameId].players.includes(playerId)) {
        socket.join(gameId);
        // console.log(io.sockets.adapter.rooms);
    }

    socket.on("submit word", (word, gameId) => {
        pool.query(
            `SELECT * FROM words WHERE word = $1`,
            [word]
        ).then(function (response) {
            // 0 represents wrong letter in the wrong spot
            // 1 represents right letter in the wrong spot
            // 2 represents right letter in the right spot
            if (response.rows.length) {
                let colors = [];
                if (word === answer[`${gameId}`]) {
                    io.to(socket.id).emit("correct word");
                    socket.to(gameId).emit("update opponent", Array(5).fill(2));
                } else {
                    for (let i = 0; i < word.length; i++) {
                        // https://reactgo.com/javascript-variable-regex/
                        const regex = new RegExp(word[i], 'g');
                        if (word[i] === answer[`${gameId}`][i]) {
                            colors.push(2);
                            for (let j = i - 1; j >= 0; j--) {
                                if (word[j] === word[i]
                                    && colors[j] === 1
                                    // https://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string
                                    && (word.slice(0, i + 1).match(regex) || []).length > (answer[`${gameId}`].match(regex) || []).length
                                ) {
                                    colors[j] = 0;
                                }
                            }
                        } else if (
                            answer[`${gameId}`].indexOf(word[i]) >= 0
                            && (word.slice(0, i + 1).match(regex) || []).length <= (answer[`${gameId}`].match(regex) || []).length
                        ) {
                            colors.push(1);
                        } else {
                            colors.push(0);
                        }
                    }
                    io.to(socket.id).emit("incorrect word", colors);
                    socket.to(gameId).emit("update opponent", colors);
                }
            } else {
                io.to(socket.id).emit("invalid word");
            }
        }).catch(function (error) {
            console.log(error);
        });
    });
    socket.on("play again", (gameId) => {
        if (again[`${gameId}`] == 1) {
            assignWord(`${gameId}`).then(function (result) {
                answer[`${gameId}`] = result;
            });
            io.to(gameId).emit("play again confirmed", again[`${gameId}`]);
            again[`${gameId}`] = 0;
            console.log("Play Again Confirmed!");
        }
        else {
            again[`${gameId}`] += 1;
            socket.to(gameId).emit("Player is ready");
        }
    });
    socket.on("done playing", (gameId) => {
        socket.to(gameId).emit("play again cancelled");
        rooms.delete(gameId);
        delete games[`${gameId}`];
        // io.in(gameId).clients.forEach(function(s){
        //     s.leave(someRoom);
        // });
        io.in(gameId).socketsLeave(gameId);
        socket.leave(gameId);
    });
});

http.listen(3000, function () {
    console.log("Listening at: http://localhost:3000");
});
