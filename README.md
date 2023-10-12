## An Attempt At Trazi's City Population Service Challenge

[See the requirements](./REQUIREMENTS.md)

## Summary

This is a simple node-based service utilizing sqlite3 to create and interact with an on-disk database of city populations.
Express.js is used to run a server providing two routes on port 5555:
- `GET /api/population/state/:state/city/:city`
- `PUT /api/population/state/:state/city/:city`
    - Expects a text/plain integer value body used to set the population.

The following scripts are provided in the package.json:
- `clean`: delete the database file and remove node_modules.
- `regen-db`: delete then recreate the database file fresh from city-populations.csv.
- `start`: run the server.

`npm i` will run a postinstall that generates the database file from `city-populations.csv`.

I also hacked together a poorly-implemented stress test in the `stress-test` directory.
It sets up X number of timeouts that will randomly hit one of the two endpoints with random city/state combos from a different csv, ensuring that we can create new entries in the database that do not already exist after database generation.
Since there are probably better ways of performing load testing such as with [autocannon](https://github.com/mcollina/autocannon), there is not a script in the package.json to run this.
Just run `stress-test.js` directly with node.

## Journal

I'd say I have pretty decent experience hitting APIs to interact with databases, but at the time of writing I don't have all that much experience actually creating and managing databases myself.

My first approach was to take the `city-populations.csv` file, parse it, and spit out a datastore onto disk that had the following structure:
```
./datastore
|
|-->/state_A
|   |-->/city_A
|   |-->/city_B
|   |-->...
|
|-->/state_B
|   |-->/city_A
|   |-->/city_B
|   |-->...
|
|-->...
```
This sort of approach worked for me in the past when developing internal tools that would spit build artifacts out to disk to be served up later to UI engineers.
While the data would persist beyond the lifetime of the server, I quickly realized I would eventually run into two key issues using this method:
1. Filesystem access is slow.
2. Managing concurrent writes would be difficult and tedious.

Thus, I eventually settled on [node-sqlite3](https://github.com/TryGhost/node-sqlite3).
Yes, sqlite is not the fastest, nor is it meant to handle extremely high traffic, and this is probably not going to meet the requirements presented by the challenge, but I found it was the easiest tool I could employ to get _something_ up and running quickly.
If I had more time, I would figure out how to get something working with Postgres but the setup for that seems to be way more complicated.

I did try my hand at using [memory-cache](https://www.npmjs.com/package/memory-cache) to provide a caching layer for the database until I realized that node-sqlite3 [has its own built-in database object cache](https://github.com/TryGhost/node-sqlite3/wiki/Caching).

I did at one point attempt load balancing with node's built-in [cluster module](https://nodejs.org/api/cluster.html) but could not figure out how to get it to play nice with express.

## Next Steps

In the future I definitely want to explore containerization and Postgres.
That seems to be a better alternative than sqlite for handling high throughput.
I also want to further explore how to employ load balancing and figure out how to get it working with express.js.

## Notes and Credits

`uscities.csv` procured from https://simplemaps.com/data/us-cities.
