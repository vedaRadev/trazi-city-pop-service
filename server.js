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

const getFromCache = (cache, toCacheKey) => (req, res, next) => {
  const key = toCacheKey(req, res);
  console.log(`Getting ${key} from cache`);
  const cachedValue = cache.get(key);
  if (cachedValue) res.locals.cachedValue = cachedValue;

  next();
}

const addToCache = (cache, toCacheKey, toValue, cacheTimeMs) => (req, res, next) => {
  const key = toCacheKey(req, res);
  const value = toValue(req, res);
  console.log(`Adding ${key} with value ${value} to cache`);
  cache.put(key, value, cacheTimeMs);

  next();
};

const removeFromCache = (cache, toCacheKey) => (req, res, next) => {
  const key = toCacheKey(req, res);
  console.log(`Removing ${key} from cache`);
  cache.del(key);

  next();
};

const getFromDatabase = (db, query, toDbQueryParams) => (req, res, next) => {
  const params = toDbQueryParams(req, res);
  console.log('querying db:', query, params);
  db.get(query, [ ...params ], (err, row) => {
    res.locals.dbError = err;
    res.locals.dbResult = row;

    next();
  });
};

const runDatabaseQuery = (db, query, toDbQueryParams) => (req, res, next) => {
  const params = toDbQueryParams(req, res);
  console.log('running db query:', query, params);
  db.run(query, [ ...params ], function(err) {
    res.locals.dbError = err;
    res.locals.lastID = this.lastID;
    res.locals.changes = this.changes;

    next();
  });
};

const server = express();

server.get(
  '/api/population/state/:state/city/:city',
  toLowerCaseParams('state', 'city'),
  getFromCache(memoryCache, ({ params }) => toPopulationCacheKey(params)),
  (_req, res, next) => {
    if (res.locals.cachedValue == null) next(); // null OR undefined
    else res.status(200).json(res.locals.cachedValue);
  },
  getFromDatabase(
    populationDatabase,
    'SELECT population FROM city_populations WHERE state=? AND city=?',
    ({ params: { state, city } }) => [ state, city ],
  ),
  addToCache(
    memoryCache,
    ({ params }) => toPopulationCacheKey(params),
    (_req, { locals: { dbResult } }) => dbResult,
    CACHE_TIME_MS,
  ),
  (req, res) => {
    console.log(res.locals);
    if (!res.locals.dbError) {
      if (res.locals.dbResult) res.status(200).json(res.locals.dbResult);
      else res.status(400).send(`No entry exists for ${req.params.city}, ${req.params.state}`);

      return;
    }

    // TODO handle error
    res.status(400).send('TODO ERROR');
  },
);

// // TODO
// server.put(
//   '/api/population/state/:state/city/:city',
//   express.text(),
//   toLowerCaseParams('state', 'city'),
//   // runDatabaseQuery(
//   //   populationDatabase,
//   //   `INSERT INTO city_populations(city, state, population)
//   //   VALUES(?, ?, ?)
//   //   ON CONFLICT(city, state) DO UPDATE SET population=excluded.population`,
//   //   ({ params: { city, state }, body: population }) => [ city, state, population ]
//   // ),
//   (_req, res, next) => {
//     if (!res.locals.dbError) {
//       console.log(res.locals.lastID);
//       console.log(res.locals.changes);
//       res.sendStatus(200);
//       next();
//       return;
//     }

//     // TODO handle error
//     console.error(res.locals.dbError);
//     res.status(400).send('TODO ERROR');
//   },
//   removeFromCache(memoryCache, ({ params }) => toPopulationCacheKey(params)),
// );

server.listen(PUBLIC_PORT, () => console.log(`Server is listening on ${PUBLIC_PORT}`));
