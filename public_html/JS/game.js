const rows = 6;
const cols = 5;
let gameboard = document.getElementById("gameboard");
for (let i = 0; i < rows; i++) {
    let inputGroup = document.createElement("fieldset");
    inputGroup.classList.add("word-guess");
    inputGroup.setAttribute("id", `guess-${i}`);
    if (i > 0) {
        inputGroup.disabled = true;
    }
    for (let j = 0; j < cols; j++) {
        let letterInput = document.createElement("input");
        if (i + j === 0) {
            letterInput.autofocus = true;
            letterInput.setAttribute("id", "current");
        }
        if (i === 0) {
            letterInput.required = true;
        }
        letterInput.setAttribute("type", "text");
        letterInput.setAttribute("maxlength", "1");
        // https://stackoverflow.com/questions/19508183/how-to-force-input-to-only-allow-alpha-letters
        // https://stackoverflow.com/questions/2257070/detect-numbers-or-letters-with-jquery-javascript
        letterInput.setAttribute("onkeydown", "return /^[a-z]|[\b]$/i.test(event.key);");
        // https://stackoverflow.com/questions/12805803/disable-copy-paste-in-html-input-fields
        letterInput.onpaste = e => e.preventDefault();
        letterInput.classList.add("letter-guess");
        inputGroup.append(letterInput);
    }
    gameboard.append(inputGroup);
}

let opponentGameboard = document.getElementById("opponent-gameboard");
for (let i = 0; i < rows; i++) {
    let row = document.createElement("tr");
    row.classList.add("opponent-guess");
    row.setAttribute("id", `opponent-guess-${i}`);
    for (let j = 0; j < cols; j++) {
        let cell = document.createElement("td");
        cell.classList.add("opponent-square");
        cell.style.backgroundColor = "lightgray";
        row.append(cell);
    }
    opponentGameboard.append(row);
}

let keyboard = document.getElementById("keyboard");
const keys = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p",
"a", "s", "d", "f", "g", "h", "j", "k", "l",
"\u23CE", "z", "x", "c", "v", "b", "n", "m", "\u232B"];
for (let key of keys) {
    if (key === "a" || key === "\u23CE") {
        let newLine = document.createElement("br");
        keyboard.append(newLine);
    }
    let keyButton = document.createElement("input");
    keyButton.textContent = key;
    keyButton.setAttribute("id", key);
    keyButton.classList.add("keyboard");
    keyButton.classList.add("keyboardKey")
    keyButton.setAttribute("value", key);
    keyButton.setAttribute("type", "button");
    if (key === "\u23CE") {
        keyButton.setAttribute("onclick", "submit();");
    } else if (key === "\u232B") {
        keyButton.setAttribute("onclick", "del();");
    } else {
        keyButton.setAttribute("onclick", "input(this);");
    }
    keyboard.append(keyButton);
}

let submitButton = document.getElementById("ENTER");
const socket = io({
    query: {
        gameId: sessionStorage.getItem("gameId"),
        playerId: sessionStorage.getItem("playerId")
    }
});
let correct = false;
let guess = "";
let guessNum = 0;
let oppGuessNum = 0;

// calculate score
function getScore(guessNum, first) {
    let score = 300 - (50 * (guessNum));
    if (first) {
        score += 100;
    }
    return score;
}
// Handle the end of each round, could improve later
function handleEnd(pScore, oScore) {
    let modal = document.getElementById("my-pop");
    let yesButton = document.getElementById("yes-button");
    let noButton = document.getElementById("no-button");
    let stateHeader = document.getElementById("pop-state");
    let scoreBody = document.getElementById("pop-score");
    let close = document.getElementsByClassName("close")[0];
    let headerTxt;
    let txt;
    if (pScore > oScore) {
        headerTxt = "WINNER!";
    }
    else if ( pScore < oScore) {
        headerTxt = "LOSER!";
    } else {
        headerTxt = "DRAW!"
    }
    stateHeader.innerText = headerTxt;
    txt =  '<div style="font-weight: bold;font-size: 18px;">STATISTICS</div><br>';
    txt += `<div> <span style="margin-right:25px; left-padding: 100px;">YOUR SCORE: ${pScore}</span>`;
    txt += `<span style="margin-left:25px; right-padding: 100px;">OPPONENT'S SCORE: ${oScore}</span></div><br><br>`;
    txt += '<div style="font-weight: bold;font-size: 18px;">PLAY AGAIN?</div><br>';
    scoreBody.innerHTML = txt;
    setTimeout(() => {
        modal.style.display = "block";
    }, 3000);
    
    close.onclick = function() {
        modal.style.display = "none";
        socket.emit("done playing", sessionStorage.getItem("gameId"));
        sessionStorage.clear();
        window.location.replace("/");
    }
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            socket.emit("done playing", sessionStorage.getItem("gameId"));
            sessionStorage.clear();
            window.location.replace("/");
        }
    }
    noButton.onclick = function() {
        modal.style.display = "none";
        socket.emit("done playing", sessionStorage.getItem("gameId"));
        sessionStorage.clear();
        window.location.replace("/");
    }
    yesButton.onclick = function() {
        socket.emit("play again", sessionStorage.getItem("gameId"));
        yesButton.disabled = true;
        txt += '<br><div>WAITING FOR THE OTHER PLAYER</div><br>';
        scoreBody.innerHTML = txt;
    }
}
// checks for end of game
function checkEnd(guessNum, oppGuessNum, oppCorrect, playerCorrect) {
    if ((guessNum === 6 && oppGuessNum === 6) || 
        (oppCorrect === 5 && guessNum === 6) ||
        (oppCorrect === 5 && playerCorrect === 1) ||
        (playerCorrect === 1 && oppGuessNum === 6)) {
        sessionStorage.removeItem("oppScore");
        sessionStorage.removeItem("oppGuessNum");
        sessionStorage.removeItem("enteredOppColors");
        sessionStorage.removeItem("playerScore");                  
        sessionStorage.removeItem("playerGuessNum");               
        sessionStorage.removeItem("enteredWords");
        sessionStorage.removeItem("enteredPlayerColors");
        return 1;
    }
    return 0;
}
// function for animations
function doAnimation(element, animation) {
    element.classList.remove(animation);
    element.offsetWidth;
    element.classList.add(animation);
}
let oppScore = 0;
let playerScore = 0;
let playerFirst = 0;
let oppFirst = 0;
let oppCorrect = 0;
let playerCorrect = 0;
if (sessionStorage.getItem("playerScore") !== null) {
    playerScore = Number(sessionStorage.getItem("playerScore"));
    document.getElementById("p-score").innerHTML = `SCORE: ${playerScore}`;
}
if (sessionStorage.getItem("oppScore") !== null) {
    oppScore = Number(sessionStorage.getItem("oppScore"));
    document.getElementById("o-score").innerHTML = `OPPONENT'S SCORE: ${oppScore}`;
}
if (sessionStorage.getItem("playerGuessNum") !== null) {
    guessNum = Number(sessionStorage.getItem("playerGuessNum"));
}
if (sessionStorage.getItem("oppGuessNum") !== null) {
    oppGuessNum = Number(sessionStorage.getItem("oppGuessNum"));
}

// https://support.microsoft.com/en-us/topic/how-to-build-a-virtual-keyboard-in-an-html-page-5b815ae2-c43c-c7a6-b4a2-f801b760ba3a
function submit() {
    let currentGuess = document.getElementById("current").parentElement;
    for (let letter of currentGuess.childNodes) {
        guess += letter.value;
    }
    if (guess.length === 5) {
        socket.emit("submit word", guess.toLowerCase(), sessionStorage.getItem("gameId"));
    } else {
        // alert("Not enough letters.");
        doAnimation(currentGuess, "shake");
        guess = "";
    }
}

function del() {
    let inputBox = document.getElementById("current");
    if (inputBox.value.length === 0 && inputBox.previousElementSibling) {
        inputBox.previousElementSibling.value = "";
    } else {
        inputBox.value = "";
    }
    if (inputBox.previousElementSibling) {
        inputBox.removeAttribute("id");
        inputBox.previousElementSibling.setAttribute("id", "current");
        inputBox.previousElementSibling.focus();
    }
}

function input(e) {
    let inputBox = document.getElementById("current");
    let val = (e.type === "button" ? e.value : e.key);
    if (inputBox.value.length === 1) {
        if (inputBox.nextElementSibling) {
            inputBox.nextElementSibling.value = val;
        }
    } else {
        inputBox.value = val;
    }
    if (inputBox.nextElementSibling) {
        inputBox.removeAttribute("id");
        inputBox.nextElementSibling.setAttribute("id", "current");
        inputBox.nextElementSibling.focus();
    }
}

document.addEventListener("keydown", function (e) {
    if (!e.repeat && guessNum < 6 && !correct) {
        if (/^[a-z]$/i.test(e.key)) {
            input(e);
        } else if (e.key === "Backspace") {
            del();
        } else if (e.key === "Enter") {
            submit();
        }
    }
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener("click", () => {
    if (guessNum < 6 && !correct) {
        document.getElementById("current").focus();
    }
});

const colorDict = {
    0: "gray",
    1: "yellow",
    2: "green"
};
// const rightLetterRightSpot = "green";
// const rightLetterWrongSpot = "yellow";
// const wrongLetterWrongSpot = "gray";

// Saves and pulls the player's progress after refreshing
let enteredWords = [];
let enteredPlayerColors = [];
if (sessionStorage.getItem("enteredWords") !== null && 
    sessionStorage.getItem("enteredPlayerColors") !== null) {
    enteredWords = sessionStorage.getItem("enteredWords").split(",");
    enteredPlayerColors = sessionStorage.getItem("enteredPlayerColors").split(",");
    for (let idx in enteredWords) {
        let currentGuess = document.getElementById(`guess-${idx}`);
        let currentColors = enteredPlayerColors[idx].split("-");
        for (let i = 0; i < 5; i++) {
            currentGuess.childNodes[i].value = enteredWords[idx][i];
            currentGuess.childNodes[i].style.backgroundColor = colorDict[Number(currentColors[i])];
            let keyButton = document.getElementById(currentGuess.childNodes[i].value);
            keyButton.style.backgroundColor = colorDict[Number(currentColors[i])];
            let inputBox = document.getElementById("current");
            if (inputBox.value.length === 1) {
                if (inputBox.nextElementSibling) {
                    inputBox.nextElementSibling.value = enteredWords[idx][i];
                }
            } else {
                inputBox.value = enteredWords[idx][i];
            }
            if (inputBox.nextElementSibling) {
                inputBox.removeAttribute("id");
                inputBox.nextElementSibling.setAttribute("id", "current");
                inputBox.nextElementSibling.focus();
            }
        }
        currentGuess.disabled = true;
        if (enteredWords.length < 6 && enteredPlayerColors[enteredWords.length-1] !== '2-2-2-2-2') {
            document.getElementById("current").removeAttribute("id");
            let nextGuess = document.getElementById(`guess-${enteredWords.length}`);
            nextGuess.disabled = false;
            nextGuess.firstChild.setAttribute("id", "current");
            nextGuess.firstChild.focus();
            let children = nextGuess.children;
            for (let child of children) {
                child.value = '';
            }
        } else {
            let keyboard = document.getElementById("keyboard");
            for (let key of keyboard.childNodes) {
                key.disabled = true;
            }
            playerCorrect = 1;
        }
    }
}
// Saves and pulls the Opponents's gameboard progress after refreshing
let enteredOppColors = [];
if (sessionStorage.getItem("enteredOppColors") !== null) {
    enteredOppColors = sessionStorage.getItem("enteredOppColors").split(",");
    for (let idx in enteredOppColors) {
        let currentOppColors = enteredOppColors[idx].split("-");
        let oppGuess = document.getElementById(`opponent-guess-${idx}`);
        for (let [index, cell] of oppGuess.childNodes.entries()) {
            cell.style.backgroundColor = colorDict[Number(currentOppColors[index])];
        }
        if (enteredOppColors[idx] === "2-2-2-2-2") {
            oppCorrect = 5;
        }
    }
} 
if (checkEnd(guessNum, oppGuessNum, oppCorrect, playerCorrect)) {
    location.reload();
}
socket.on("correct word", () => {
    // alert("Correct word!");
    let currentGuess = document.getElementById(`guess-${guessNum++}`);
    let currentWord = '';
    for (let letterInput of currentGuess.childNodes) {
        letterInput.style.backgroundColor = colorDict[2];
        let keyButton = document.getElementById(letterInput.value.toLowerCase());
        keyButton.style.backgroundColor = colorDict[2];
        currentWord += letterInput.value;
    }
    doAnimation(currentGuess.childNodes[0], "winner1");
    doAnimation(currentGuess.childNodes[1], "winner2");
    doAnimation(currentGuess.childNodes[2], "winner3");
    doAnimation(currentGuess.childNodes[3], "winner4");
    doAnimation(currentGuess.childNodes[4], "winner5");
    enteredWords.push(currentWord.toLowerCase());
    enteredPlayerColors.push('2-2-2-2-2');
    currentGuess.lastChild.removeAttribute("id");
    currentGuess.disabled = true;
    correct = true;
    let keyboard = document.getElementById("keyboard");
    for (let key of keyboard.childNodes) {
        key.disabled = true;
    }
    if (oppFirst === 0) {
        playerFirst = 1;
    }
    playerScore = getScore(guessNum - 1, playerFirst);
    let pScore = document.getElementById("p-score");
    pScore.innerText = `SCORE: ${playerScore}`;
    sessionStorage.setItem("playerScore", playerScore);
    sessionStorage.setItem("playerGuessNum", guessNum);
    sessionStorage.setItem("enteredWords", enteredWords.join());
    sessionStorage.setItem("enteredPlayerColors", enteredPlayerColors.join());
    playerCorrect = 1;
    if (checkEnd(guessNum, oppGuessNum, oppCorrect, playerCorrect)) {
        handleEnd(playerScore, oppScore);
    }
});


socket.on("update opponent", (colors) => {
    let oppGuess = document.getElementById(`opponent-guess-${oppGuessNum++}`);
    oppCorrect = 0;
    for (let [index, cell] of oppGuess.childNodes.entries()) {
        cell.style.backgroundColor = colorDict[colors[index]];
        if (colors[index] === 2) {
            oppCorrect++;
        }
    }
    enteredOppColors.push(colors.join('-'));
    if (oppCorrect === 5) {
        if (playerFirst === 0) {
            oppFirst = 1;
        }
        oppScore = getScore(oppGuessNum - 1, oppFirst);
    } else {
        oppScore = getScore(oppGuessNum, oppFirst);
    }
    let oScore = document.getElementById("o-score");
    oScore.innerText = `OPPONENT'S SCORE: ${oppScore}`;
    sessionStorage.setItem("oppScore", oppScore);
    sessionStorage.setItem("oppGuessNum", oppGuessNum);
    sessionStorage.setItem("enteredOppColors", enteredOppColors.join());
    if (checkEnd(guessNum, oppGuessNum, oppCorrect, playerCorrect)) {
        handleEnd(playerScore, oppScore);
    }
});

socket.on("incorrect word", (colors) => {
    // alert("Incorrect word.");
    let currentGuess = document.getElementById(`guess-${guessNum++}`);
    doAnimation(document.getElementById("gameboard"), "shake");
    let currentWord = '';
    for (let [index, letterInput] of currentGuess.childNodes.entries()) {
        letterInput.style.backgroundColor = colorDict[colors[index]];
        let keyButton = document.getElementById(letterInput.value.toLowerCase());
        if (keyButton.style.backgroundColor !== "green") {
            if (keyButton.style.backgroundColor === "yellow" && colors[index] > 1) {
                keyButton.style.backgroundColor = colorDict[colors[index]];
            } else if (keyButton.style.backgroundColor === "") {
                keyButton.style.backgroundColor = colorDict[colors[index]];
            }
        }
        currentWord += letterInput.value;
    }
    enteredWords.push(currentWord.toLowerCase());
    enteredPlayerColors.push(colors.join('-'));
    currentGuess.lastChild.removeAttribute("id");
    currentGuess.disabled = true;
    if (guessNum < 6) {
        let nextGuess = document.getElementById(`guess-${guessNum}`);
        nextGuess.disabled = false;
        nextGuess.firstChild.setAttribute("id", "current");
        nextGuess.firstChild.focus();
        guess = "";
    } else {
        // alert("No more guesses");
        let keyboard = document.getElementById("keyboard");
        for (let key of keyboard.childNodes) {
            key.disabled = true;
        }
    }
    playerScore = getScore(guessNum, playerFirst);
    let pScore = document.getElementById("p-score");
    pScore.innerText = `SCORE: ${playerScore}`;
    sessionStorage.setItem("playerScore", playerScore);
    sessionStorage.setItem("playerGuessNum", guessNum);
    sessionStorage.setItem("enteredWords", enteredWords.join());
    sessionStorage.setItem("enteredPlayerColors", enteredPlayerColors.join());
    if (checkEnd(guessNum, oppGuessNum, oppCorrect, playerCorrect)) {
        handleEnd(playerScore, oppScore);
    }
});
socket.on("invalid word", () => {
    // alert("Invalid word.");
    let currentGuess = document.getElementById(`guess-${guessNum}`);
    doAnimation(currentGuess, "shake");
    for (let letterInput of currentGuess.childNodes) {
        letterInput.value = "";
    }
    guess = "";
    currentGuess.lastChild.removeAttribute("id");
    currentGuess.firstChild.setAttribute("id", "current");
    currentGuess.firstChild.focus();
});
socket.on("play again confirmed", (again) => {
    if (again == 1) {
        window.location.reload();
    }
});
socket.on("Player is ready", () => {
    let scoreBody = document.getElementById("pop-score");
    scoreBody.innerHTML += '<br><div>THE OTHER PLAYER IS READY</div><br>';
});
socket.on("play again cancelled", () => {
    let scoreBody = document.getElementById("pop-score");
    let yesButton = document.getElementById("yes-button");
    scoreBody.innerHTML += '<br><div>THE OTHER PLAYER WON\'T PLAY AGAIN</div><br>';
    yesButton.disabled = true;
    sessionStorage.clear();
});
