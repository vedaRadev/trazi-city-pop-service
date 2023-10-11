const express = require('express');
const sqlite3 = require('sqlite3');
// const memoryCache = require('memory-cache');

const PUBLIC_PORT = 5555;
// const CACHE_TIME_MS = 5000;

// const toPopulationCacheKey = ({ state, city }) => `${state}${city}`;

// const USER_FACING_ERROR_MAP = {
//   SQLITE_ABORT: 'The database operation was aborted',
//   SQLITE_BUSY: 'The database file is in use and could not be written to',
//   SQLITE_LOCKED: 'The database file is in use and could not be written to',
//   SQLITE_INTERRUPT: 'The database operation was interrupted',
//   SQLITE_CONSTRAINT: 'A query constraint was violated. Does the record already exist?',
// };

// const toSqliteErrorCode = msg => msg.match(/^SQLITE.*?(?=:)/)?.[0];

// Given a sqlite db error, provide a nice error to be sent to an API consumer
const toUserFacingErrorMessage = message => {
  return message;
  // const sqliteErrorCode = toSqliteErrorCode(message);
  // return USER_FACING_ERROR_MAP[sqliteErrorCode] ?? message;
};

const populationDatabase = new sqlite3.cached.Database(
  'city-populations.db',
  sqlite3.OPEN_READWRITE,
  err => {
    if (err) {
      console.error('Encountered an error when attempting to establish database connection:', err.message);
      process.exit();
    }
  }
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
    // const cacheKey = toPopulationCacheKey(req.params);
    // const cachedValue = memoryCache.get(cacheKey);
    // if (cachedValue != null) return res.status(200).json(cachedValue);

    const { params: { state, city } } = req;
    populationDatabase.get(
      'SELECT population FROM city_populations WHERE state=? AND city=?',
      [ state, city ],
      (err, row) => {
        if (err) {
          console.error(`An error occurred when attempting to retrieve record ${city} ${state}:`, err.message);
          res.send(500).send('Failed to get record:', toUserFacingErrorMessage(err.message));
        } else if (row != null) {
          res.status(200).json(row);
          // memoryCache.put(cacheKey, row, CACHE_TIME_MS);
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
    if (req.get('Content-Type').toLowerCase() !== 'text/plain') {
      res.status(400).send('Only text/plain Content-Type body is allowed');
      return;
    }

    const { params: { state, city }, body: population } = req;

    // I wanted to use a sqlite upsert statement here but there was no good way of determining if
    // a record was inserted or updated.
    // See docs here: https://github.com/TryGhost/node-sqlite3/wiki/API#runsql--param---callback
    // Note the section about the `lastID` and `changes` properties.
    populationDatabase.get(
      'SELECT EXISTS(SELECT 1 FROM city_populations WHERE state=? AND city=?)',
      [ state, city ],
      (err, row) => {
        if (err) {
          console.error(err.message);
          res.status(500).send('An internal error has occurred');
          return;
        }

        const [ exists ] = Object.values(row);
        if (exists) {
          populationDatabase.run(
            `UPDATE city_populations SET population=?
            WHERE city=? AND state=?`,
            [ population, city, state ],
            err => {
              if (!err) {
                res.sendStatus(200);
                // memoryCache.del(toPopulationCacheKey(req.params));
                return;
              }

              console.error(`Error when attempting to update ${city} ${state} ${population}:`, err);
              res.status(400).send(`Failed to update record: ${toUserFacingErrorMessage(err.message)}`);
            }
          );
        } else {
          populationDatabase.run(
            `INSERT INTO city_populations(city, state, population) VALUES(?, ?, ?)`,
            [ city, state, population ],
            err => {
              if (!err) {
                res.sendStatus(201);
                return;
              }

              console.error(`Error when attempting to insert ${city} ${state} ${population}:`, err);
              res.status(400).send(`Failed to create record: ${toUserFacingErrorMessage(err.message)}`);
            }
          );
        }
      }
    )
  }
);

server.listen(PUBLIC_PORT, () => console.log(`Server is listening on ${PUBLIC_PORT}`));

const handleExit = () => {
  console.log('\nClosing database');
  populationDatabase.close();
  process.exit();
};

process.on('SIGINT', handleExit);
process.on('SIGUSR1', handleExit);
process.on('SIGUSR2', handleExit);
process.on('uncaughtException', handleExit);
