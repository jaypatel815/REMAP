#!/bin/bash
if [[ $1 == "-init" ]] && [[ $# -eq 1 ]]; then
    echo "Please enter your postgres password";
    read -s password;
    echo "Building database"
    PGPASSWORD=$password psql -U postgres -w -c "SELECT 1 FROM pg_database WHERE datname = 'test'" | grep -q 1 || PGPASSWORD=$password psql -U postgres -c "CREATE DATABASE test"
    PGPASSWORD=$password psql -U postgres -w -d test -c "CREATE TABLE IF NOT EXISTS words ( 
                                id SERIAL PRIMARY KEY, 
                                word VARCHAR(5) NOT NULL, 
                                used text[] 
                                )"
    PGPASSWORD=$password psql -U postgres -w -d test -c "TRUNCATE words RESTART IDENTITY CASCADE;" -c "\copy words(word) FROM 'words.txt';"

elif [[ $1 = "-destroy" ]] && [[ $# -eq 1 ]]; then
    echo "Please enter your postgres password";
    read -s password;
    echo "Destroying Database"
    PGPASSWORD=$password psql -U postgres -c "DROP DATABASE test;"
elif [[ $1 = "-backup" ]] && [[ $# -eq 1 ]]; then
    echo "Please enter your postgres password";
    read -s password;
    echo "Saving database to file"
    PGPASSWORD=$password psql -U postgres -d test -c "\copy words(word, used) TO 'backUp.csv' DELIMITER ',' CSV HEADER;"
elif [[ $1 = "-update" ]] && [[ $# -eq 1 ]]; then
    echo "Please enter your postgres password";
    read -s password;
    echo "Updating database"
    PGPASSWORD=$password psql -U postgres -d test -c "TRUNCATE words RESTART IDENTITY CASCADE;" -c "\copy words(word, used) FROM 'backUp.csv' DELIMITER ',' CSV HEADER;"
else
    echo "Invalid Usage
          Usage:
            -init  -> Initializes database
            --------------------------------
            -destroy -> Drops database
            --------------------------------
            -backup -> Saves the database on external file
            --------------------------------
            -update -> Updates database"
fi
