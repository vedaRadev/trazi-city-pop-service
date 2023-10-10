const sqlite3 = require('sqlite3');
const fs = require('fs');

if (fs.existsSync('city-populations.db')) {
  throw new Error('The database file already exists.');
}

// This function is copied from one of the answers at
// https://stackoverflow.com/questions/8493195/how-can-i-parse-a-csv-string-with-javascript-which-contains-comma-in-data
const csvToArray = (text) => {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
};

const raw = fs.readFileSync('city-populations.csv');
const records = csvToArray(raw.toString())
  // just skip over some of the malformed data (not sure if it's intended to be like that or not).
  // also this would be a terrible practice in production.
  // see notes.txt for notes about malformed data in the csv.
  .filter(([ city, state, population ]) => city && state && !Number.isNaN(+population)) // attempt to convert population to a number
  // prep for case-insensitive and db insertion
  .map(([ city, state, ...rest ]) => [ city.toLowerCase().replace('\'', '\'\''), state.toLowerCase(), ...rest ]);

const db = new sqlite3.Database('city-populations.db');
const insertionValuesString = records.reduce((acc, [ city, state, population ]) => {
  const recordString = `('${city}', '${state}', ${population})`;
  if (!acc) return recordString;
  else return `${acc}, ${recordString}`;
}, '');

db.serialize(() => {
  db.run(`
    CREATE TABLE city_populations (
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      population INTEGER NOT NULL,
      PRIMARY KEY (state, city)
    );`);
  db.run(`INSERT INTO city_populations (city,state,population) VALUES ${insertionValuesString};`);
});

db.close();
