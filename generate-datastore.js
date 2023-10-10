const fs = require('fs');
const fsPromises = require('fs/promises');

const BASE_DIR = __dirname;
const DATASTORE_DIR = `${BASE_DIR}/datastore`;

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

const raw = fs.readFileSync('city_populations.csv');
const groupedByState = csvToArray(raw.toString())
  // just skip over some of the malformed data (not sure if it's intended to be like that or not).
  // also this would be a terrible practice in production.
  .filter(([ city, state, population ]) => {
    // There is at least one entry that contains a forward slash.
    // This will be problematic since I'm envisioning the datastore being structured
    // as one file per city.
    // Also deal with backslash in case of windows environment.
    return city && !city.match(/\\|\//) && state && population != undefined;
  })
  // prep for case-insensitive
  .map(([ city, state, ...rest ]) => [ city.toLowerCase(), state.toLowerCase(), ...rest ])
  // group by state
  .reduce((acc, [ city, state, population ]) => {
    const entry = [ city, population ];

    if (!acc[state]) acc[state] = [ entry ];
    else acc[state].push(entry);

    return acc;
  }, {});

// generate datastore
fs.mkdirSync(DATASTORE_DIR);
(async () => {
  await Promise.all(
    Object
      .entries(groupedByState)
      .map(async ([ state, entries ]) => {
        const stateDir = `${DATASTORE_DIR}/${state}`; 
        await fsPromises.mkdir(stateDir);
        return Promise.all(entries.map(([ city, population ]) => fsPromises.writeFile(`${stateDir}/${city}`, population)));
      })
  );
})();
