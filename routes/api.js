"use strict"

const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();

let station_collection = {} // later replace with DB collection
let tour_collection = {}
let id_counter = 0


// Debugging

let test_station = {
  type: "Feature",
  properties:
  {
    name: "Teststation",
    description: "Ich bin eine Teststation",
    url: "https://www.youtube.com/watch?v=o-YBDTqX_ZU"
  },
  geometry:
  {
    coordinates: 
    [
      7.595732042580437,
      51.96943649024783
    ],
    type: "Point"
  }
}

add_item(test_station, station_collection)


// ------------------- DB-Functions -------------------
/**
 * Adds an item to the desired database collection.
 * @param {*} item - Data to add to the DB.
 * @param {*} collection - DB Collection where the Data should be added to.
 */
function add_item(item, collection)
{
  const ID = id_counter
  id_counter += 1

  collection[ID] = {
    geojson: item
  }
}


// ------------------- Webserver-Routes: Station-Website -------------------

// API calls generally do not want caching because the returned data may change
ROUTER.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})


ROUTER.get('/stations', function(_req, res)
{
  res.json(station_collection)
})



ROUTER.post('/add_station', function(req, res) {
  add_item(req.body, station_collection);

  res.send()
});


ROUTER.post('/delete_station', function(req, res) {
  const ID = req.body.id;

  delete station_collection[ID]

  res.send()
});


ROUTER.post('/update_station', function(req, res) {
  const ID = req.body.id;

  station_collection[ID].geojson = req.body.geojson;

  res.send()
});

// ------------------- Webserver-Routes: Tour-Website -------------------


ROUTER.get('/tours', function(_req, res)
{
  res.json(tour_collection)
})

ROUTER.post('/add_tour', function(req, res) {
  add_item(req.body, tour_collection);

  res.send()
});


ROUTER.post('/delete_tour', function(req, res) {
  const ID = req.body.id;

  delete tour_collection[ID]

  res.send()
});


ROUTER.post('/update_tour', function(req, res) {
  const ID = req.body.id;

  tour_collection[ID].geojson = req.body.geojson;

  res.send()
});

module.exports = ROUTER;
