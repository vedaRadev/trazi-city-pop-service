const express = require('express');
const sqlite3 = require('sqlite3');
const memoryCache = require('memory-cache');

const PUBLIC_PORT = 5555;
const CACHE_TIME_MS = 5000;

const toPopulationCacheKey = ({ state, city }) => `${state}${city}`;

const populationDatabase = new sqlite3.Database(
  'city-populations.db',
  sqlite3.OPEN_READWRITE,
  // TODO handle case where db cannot be opened
  // (err) => { ... }
);

const toLowerCaseParams = (...props) => (req, _, next) => {
  for (const prop of props) {
    req.params[prop] = req.params[prop].toLowerCase();
  }

  next();
};

const server = express();

server.get(
  '/api/population/state/:state/city/:city',
  toLowerCaseParams('state', 'city'),
  (req, res) => {
    const cacheKey = toPopulationCacheKey(req.params);
    const cachedValue = memoryCache.get(cacheKey);
    if (cachedValue != null) return res.status(200).json(cachedValue);

    const { params: { state, city } } = req;
    populationDatabase.get(
      'SELECT population FROM city_populations WHERE state=? AND city=?',
      [ state, city ],
      (err, row) => {
        console.log(err);
        if (err) {
          // TODO handle err
          res.sendStatus(500);
        } else if (row !== null) {
          res.status(200).json(row);
          memoryCache.put(cacheKey, row, CACHE_TIME_MS);
        } else {
          res.status(400).send(`No entry exists for ${city}, ${state}`);
        }
      }
    );
  }
);

server.put(
  '/api/population/state/:state/city/:city',
  express.text(),
  toLowerCaseParams('state', 'city'),
  (req, res) => {
    const { params: { state, city }, body: population } = req;

    populationDatabase.get(
      'SELECT EXISTS(SELECT 1 FROM city_populations WHERE state=? AND city=?)',
      [ state, city ],
      (err, row) => {
        if (err) {
          res.sendStatus(500);
          return;
        }

        const [ exists ] = Object.values(row);
        if (exists) {
          populationDatabase.run(
            `UPDATE city_populations SET population=?
            WHERE city=? AND state=?`,
            [ population, city, state ],
            err => {
              if (!err) return res.sendStatus(200);
              res.sendStatus(400);
            }
          );
        } else {
          populationDatabase.run(
            `INSERT INTO city_populations(city, state, population) VALUES(?, ?, ?)`,
            [ city, state, population ],
            err => {
              if (!err) return res.sendStatus(201);
              res.sendStatus(400);
            }
          );
        }
      }
    )
  }
);

server.listen(PUBLIC_PORT, () => console.log(`Server is listening on ${PUBLIC_PORT}`));
