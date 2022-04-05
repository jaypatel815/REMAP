const socket = io({
    query: {
        gameId: sessionStorage.getItem("gameId"),
        playerId: sessionStorage.getItem("playerId")
    }
});

// socket.on("unknownCode", handleUnknownCode);
// socket.on("tooManyPlayers", handleTooManyPlayers);

const waitingScreen = document.getElementById("waitingScreen");
const homeScreen = document.getElementById("homeScreen");
const newGameBtn = document.getElementById("newGameButton");
const joinGameBtn = document.getElementById("joinGameButton");
const gameCodeInput = document.getElementById("gameCodeInput");
const gameCodeDisplay = document.getElementById("gameCodeDisplay");

newGameBtn.addEventListener("click", newGame);
joinGameBtn.addEventListener("click", joinGame);

function newGame() {
    socket.emit("new game");
}

socket.on("game created", (info) => {
    sessionStorage.clear();
    sessionStorage.setItem("gameId", info.gameId);
    sessionStorage.setItem("playerId", info.playerId);
    init(info.gameId);
});

function joinGame() {
    const gameId = gameCodeInput.value;
    socket.emit("join game", gameId);
}

socket.on("game joined", (info) => {
    sessionStorage.clear();
    sessionStorage.setItem("gameId", info.gameId);
    sessionStorage.setItem("playerId", info.playerId);
});

socket.on("start game", () => {
    window.location.replace("game.html");
});

socket.on("failed to join game", () => {
    alert("Failed to join game.");
});

function init(gameId) {
    homeScreen.style.display = "none";
    waitingScreen.style.display = "block";
    gameCodeDisplay.innerText = gameId;
}

// function handleUnknownCode() {
//     reset();
//     alert("Unknown game code.");
// }

// function handleTooManyPlayers() {
//     reset();
//     alert("This game is already in progress.");
// }

// function reset() {
//     gameCodeInput.value = "";
//     homeScreen.style.display = "block";
//     waitingScreen.style.display = "none";
// }
