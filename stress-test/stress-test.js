const fs = require('fs');

const MAX_TIMERS = 3000;

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

// ad hoc zip
const zip = (arr1, arr2) => {
  if (arr1.length !== arr2.length) throw new Error('Arrays must be same length');

  let zipped = [];
  for (let i = 0; i < arr1.length; i++) {
    zipped[i] = [ arr1[i], arr2[i] ];
  }

  return zipped;
};

const toRandomInt = (min, maxExclusive) => Math.floor(Math.random() * (maxExclusive - min) + min);
const toRandomEntry = entries => entries[toRandomInt(0, entries.length)];
const toUrl = ([ city, state ]) => `http://localhost:5555/api/population/state/${state}/city/${city}`;

const raw = fs.readFileSync(`${__dirname}/uscities.csv`);
const [ fields, ...records ] = csvToArray(raw.toString());

const cityStateRecs = records
  .filter(rec => rec.length === fields.length)
  .map(rec => zip(fields, rec)
    .filter(([ field ]) => field === 'city_ascii' || field === 'state_name')
    .map(([, value]) => value.replace(' ', '%20'))
  );

// this does a bunch of things all at once but whatever
// this is just an ad hoc test script
const queueNextRandomRequestTimer = () => {
  setTimeout(async () => {
    const url = toUrl(toRandomEntry(cityStateRecs));
    const pop = toRandomInt(0, 10000);
    const method = !toRandomInt(0, 2) ? 'GET': 'PUT';

    fetch(
      url,
      {
        method,
        ...(method === 'PUT' 
          ? { headers: { 'Content-Type': 'text/plain' }, body: `${pop}` } 
          // : { headers: { 'Accept': 'application/json' } }
          : {}
        )
      }
    )
      .then(async response => {
        const { status } = response;
        if (status !== 200 && status !== 201) {
          const text = await response.text();
          console.log(`FAILED (${status}): ${method} ${url} ${pop} => ${text}`);
        } else {
          const out = method === 'GET' ? JSON.stringify(await response.json()) : await response.text();
          console.log(`SUCCESS (${status}): ${method} ${url} ${method === 'PUT' ? pop : ''} => ${out}`);
        }
      })
      .catch(error => {
        console.error('FAILED TO FETCH', method, url, ':', error.message, error.cause.code);
      })
      .finally(queueNextRandomRequestTimer);
  }, toRandomInt(100, 2000));
};

for (let i = 0; i < MAX_TIMERS; i++) {
  queueNextRandomRequestTimer();
}
