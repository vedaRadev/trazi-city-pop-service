## Summary
You will be writing a node.js service that allows you to get a city's population by state + city while also letting you set a city's population. This service will be hit hard and needs to return data as fast as possible, so make sure you write this service with response time and throughput in mind.

## Requirements
* Use Node.js v18
* Written in plain JS (no TypeScript)
* Running `npm install` will install dependencies for the project.
* Running `npm start` will start the service and its dependencies.
* The service will run on port `5555`.
* The data must `persist`.
* Must have the route `GET http://127.0.0.1:5555/api/population/state/:state/city/:city`.
    * This allows a `:state` and a `:city` to be passed in.
        * e.g. http://127.0.0.1:5555/api/population/state/Florida/city/Orlando
    * State and City should not be case sensitive.
    * 400 status with a proper error message if state/city combo can't be found.
    * 200 status with JSON response if found.
        * e.g. `{"population": 32423}`
* Must have the route `PUT http://127.0.0.1:5555/api/population/state/:state/city/:city`.
    * This allows a `:state` and a `:city` to be passed in.
        * e.g. http://127.0.0.1:5555/api/population/state/Florida/city/Orlando
    * State and City should not be case sensitive.
    * Body should be plain text that contains just the number to be set as the population.
    * 400 status with a proper error message if the data could not be added.
    * 200 status if data has updated a state/city that already exists.
    * 201 status if the data was created instead of updated.

## The Data
The data can be found (here)[https://github.com/Trazi-Ventures/sample-data-intervie/blob/main/city_populations.csv].
You are allowed to change the data's format, schema, and how it's stored.
The only rule is that the data returns back with the expected population that's in the file above.
For example, for `GET http://127.0.0.1:5555/api/population/state/Alabama/city/Marion` the population of 3178 should be returned.
Feel free to store the data in any format using any method.
Just remember that response time and throughput is key.

## What We Are Looking For
* Fast response time - the lower you can get this number the better. HINT: Are you sure you're using the fastest REST framework for Node?
* High throughput - how many concurrent requests/users can the service handle?
* Minimal use of 3rd party modules - lot's of 3rd party modules don't have speed as their primary focus.
* Optimized JavaScript code - how well do you utilize JavaScript to meet your goal instead of being hindered by some of its conveniences?
* Structured code - is it all in a giant blob file or is it well structured for ease of development and future expansion?
