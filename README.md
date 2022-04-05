# [REMAP](https://gitlab.cci.drexel.edu/ed584/cs-375-project)
A web-based game that is inspired by the popular game Wordle (and 
Squabble).


## About
REMAP is a two-player game that enables players to compete with each 
other to guess five-letter words. The players have six guesses, and 
provides hints after each guess depending on if the letter is in the 
word and in the right cell (green), the letter is in the word and in the 
wrong cell (yellow), or the letter is not in the word (gray or no 
color).

## Technologies Used
- HTML, CSS, and JavaScript
- Express (Node.js)
- PostgreSQL (Postgres) RDBMS and psql
- Bash
- Socket.IO (WebSockets)
- Web Storage API

## Getting Started
To launch this project, you can download the source code as a zip file or you can clone the repo to your local machine. After you have downladed the project to your local machine, follow the steps below:
  
### 1. Open command-line and navigate to the project directory
```bash
$ cd cs-375-project
```
    
### 2. Initialize (when running for first time or after deleting the database) the database by:
**Navigate to the "db" directory and initialize database by executing the commands below**
```bash
$ cd db
$ ./db.bash -init
```

**Database maintaining:**
1. execute the command `./db.bash -backup` to save a local backup of the Database
2. execute the command `./db.bash -update` to update the current database with the latest one
3. execute the command `./db.bash -destroy` to delete database

### 3. Set database password for Postgres
**Navigate back to the home directory of the project folder**
```bash
$ cd ..
$ vim env.json

Type in your Postgres password where the line reads "password": "" in between the quotes.
```

### 5. Initialize Express and Socket.io modules:
**Navigate back to the home directory of the project folder**
```bash
$ cd ..
$ npm install express
$ npm install socket.io
```
### 5. Launch server:
```bash
$ node server.js
```
### 6. Visit `http://localhost:3000`
