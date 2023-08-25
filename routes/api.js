"use strict"

const { GEOJSON_ADD_SCHEMA, GEOJSON_UPDATE_SCHEMA } = require("../express_validator_schemes/geojson_schema")

const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();
const DOTENV = require('dotenv');
const { body, checkSchema, validationResult } = require('express-validator')

// --------------- DATABASE INITIALIZATION ---------------

const { ObjectId } = require('mongodb');
const MONGO_CLIENT = require('mongodb').MongoClient;
const URL = 'mongodb://127.0.0.1:/3000'; // connection URL
const CLIENT = new MONGO_CLIENT(URL); // mongodb client
const DB_NAME = 'mydatabase'; // database name
const COLLECTION_NAME_TOURS = 'touren'; // collection name
const COLLECTION_NAME_STATIONS = 'stations'; // collection name
let db // Database-Instance where all data is stored
let tour_collection; // Collection-Instance to perform database operations on
let station_collection; // Collection-Instance to perform database operations on

/**
 * Function to initialize the Database and Collection and store them in global variables for later access.
 */
async function initialize_DB() {
  try {
    await CLIENT.connect();
    db = CLIENT.db(DB_NAME);
    station_collection = db.collection(COLLECTION_NAME_STATIONS);
    console.log(`Erfolgreich mit '${DB_NAME}.${COLLECTION_NAME_STATIONS}' verbunden`);
    tour_collection = db.collection(COLLECTION_NAME_TOURS);
    console.log(`Erfolgreich mit '${DB_NAME}.${COLLECTION_NAME_TOURS}' verbunden`);
  }
  catch (err) {
    console.log(err)
  }
}

initialize_DB()

// ------------------- DB-Functions -------------------
/**
 * Adds an item to the desired database collection.
 * @param {*} item - Data to add to the DB.
 * @param {*} collection - DB Collection where the Data should be added to.
 */
async function add_item(item, collection) {
  try {
    const RESULT = await collection.insertOne(item);
    console.log('Neues Element in die Datenbank eingefügt');
    console.log('Eingefügte ID:', RESULT.insertedId);
  } 
  catch (err) {
    console.error('Fehler beim Einfügen des Elements in die Datenbank:', err);
  } 
}

/**
 * Returns all items from the desired database collection.
 * @param {*} collection - DB Collection which Data should be returned.
 * @returns {*} - Items from the DB Collection
 */
async function get_items(collection) {
  try {
      const VALUES = await collection.find({}).toArray();
      console.log('Alle Werte der Collection abgerufen');
      return VALUES;
    } 
    catch (err) {
      console.error('Fehler beim Abrufen der Werte aus der Collection:', err);
      return null;
    } 
}

/**
 * Deletes an item from the desired database collection.
 * @param {*} id - Id of the item which should be deleted
 * @param {*} collection - DB Collection where the Data should be deleted.
 */
async function delete_item(id, collection) {
  try {
    const RESULT = await collection.deleteOne({ _id: new ObjectId(id) }); // Datensatz anhand der ID löschen

    if (RESULT.deletedCount === 1) {
      return { message: 'Datensatz erfolgreich gelöscht' };
    } 
    else {
      return { message: 'Datensatz nicht gefunden' };
    }
  } catch (err) {
    console.error('Fehler beim Löschen des Datensatzes:', err);
  }
}

/**
 * Updates an item from the desired database collection.
 * @param {*} id - Id of the item which should be updated
 * @param {*} newData - Tour- or Station-Data which should be the new state
 * @param {*} collection - DB Collection where the Data should be updated.
 */
async function update_item(id, newData, collection) {
  try {

    // the collections need different kinds of updates
    let result = null
    if (collection === station_collection)
    {
      result = await collection.updateOne(
        { _id: new ObjectId(id) }, 
        { $set: newData.geojson } 
      );
    }
    else if (collection === tour_collection)
    {
      result = await collection.updateOne(
        { _id: new ObjectId(id) }, 
        { $set: newData } 
      );
    }

    if (result.modifiedCount === 1) {
      return { message: 'Datensatz erfolgreich aktualisiert' };
    } 
    else {
      return { message: 'Datensatz nicht gefunden' };
    }
  } 
  catch (err) {
    console.error('Fehler beim Aktualisieren des Datensatzes:', err);
  }
}


// ------------------- Webserver-Routes: Station-Website -------------------

// API calls generally do not want caching because the returned data may change
ROUTER.use(function(_req, res, next) {
  res.set('Cache-Control', 'no-store')
  next()
})


ROUTER.get('/stations', async function(_req, res) {
  try {
    const STATIONS = await get_items(station_collection); 

    if (STATIONS) {
      res.json(STATIONS); 
    } 
    else {
      res.status(404).json({ message: 'Keine Stationen gefunden' });
    }
  } 
  catch (err) {
    console.error('Fehler beim Abrufen der Stationen:', err);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
})


// added middleware to check whether the request-body matches the schema
// For some unclear reasons the last validation chain "body('geometry.coordinates[0].*.*')..." has to be defined outside of the schema to work porperly
ROUTER.post('/add_station', checkSchema(GEOJSON_ADD_SCHEMA, ['body']), 
  body('geometry.coordinates[0].*.*')
  .trim()
  .notEmpty()
  .withMessage("Die Koordinaten dürfen nicht leer sein!")
  .custom(function(value) 
  { 
    // test if input is a valid float like "123.00", "123.x", "x.132"
    return /\d+\.\d+/.test(parseFloat(value)) 
  })
  .withMessage("Die Koordinate muss eine Gleitkommazahlen sein!"), function(req, res) {
  
  const RESULT = validationResult(req)
  const ERRORS = RESULT.array()
  console.log("valid errors", ERRORS)
  console.log(req.body)

  // request was invalid
  if (ERRORS.length > 0)
  {
    let error_message = ""
    for (const error of ERRORS)
    {
      error_message += `Im Wert '${error.value}' ist ein Fehler. Bitte beachte die Fehlernachricht: </br> "${error.msg}"`
      if (ERRORS.length > 1)
      {
        error_message += "</br>"
      }
    }
    
    res.status(400).json({message: error_message})
  }
  else
  {
    add_item(req.body, station_collection);
    res.status(200).json({message: "Alles ok."})
  }
  
});

ROUTER.post('/delete_station', function(req, res) {
  const ID = req.body.id;
  delete_item(ID, station_collection);
  res.send();
});


ROUTER.post('/update_station', checkSchema(GEOJSON_UPDATE_SCHEMA, ['body']), 
body('geometry.coordinates[0].*.*')
.trim()
.notEmpty()
.withMessage("Die Koordinaten dürfen nicht leer sein!")
.custom(function(value) 
{ 
  // test if input is a valid float like "123.00", "123.x", "x.132"
  return /\d+\.\d+/.test(parseFloat(value)) 
})
.withMessage("Die Koordinate muss eine Gleitkommazahlen sein!"), function(req, res) {

  const ID = req.body.id;
  let new_data = {
    geojson: req.body.geojson
  }

  const RESULT = validationResult(req)
  const ERRORS = RESULT.array()
  console.log("valid errors", ERRORS)
  console.log("Request Body im Update route", req.body)

  // request was invalid
  if (ERRORS.length > 0)
  {
    let error_message = ""
    for (const error of ERRORS)
    {
      error_message += `Im Wert '${error.value}' ist ein Fehler. Bitte beachte die Fehlernachricht: </br> "${error.msg}"`
      if (ERRORS.length > 1)
      {
        error_message += "</br>"
      }
    }

    res.status(400).json({message: error_message})
  }
  else
  {
    update_item(ID, new_data, station_collection)
    res.status(200).json({message: "Alles ok."})
  }

});

// ------------------- Webserver-Routes: Tour-Website -------------------


ROUTER.get('/tours', async function(_req, res) {
  try {
    const TOURS = await get_items(tour_collection); 

    if (TOURS) {
      res.json(TOURS); 
    } 
    else {
      res.status(404).json({ message: 'Keine Touren gefunden' });
    }
  } 
  catch (err) {
    console.error('Fehler beim Abrufen der Touren:', err);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
})

ROUTER.post('/add_tour', function(req, res) {
  add_item(req.body, tour_collection);

  res.send()
});


ROUTER.post('/delete_tour', function(req, res) {
  const ID = req.body.id;
  delete_item(ID, tour_collection);
  res.send();
});


ROUTER.post('/update_tour', function(req, res) {
  const ID = req.body.id;
  let new_data = {
    name: req.body.name,
    stations: req.body.stations,
    segments: req.body.segments,
    instructions: req.body.instructions,
    distance: req.body.distance
  };
    
    update_item(ID, new_data, tour_collection);
    res.send()
});

// ------------------- Routing-Routes: Tour-Website -> Graphhopper -------------------
//Load enviroment(API_KEY) from .env file
DOTENV.config();
const API_KEY = process.env.GRAPHHOPPER_API_KEY;

/**
 * Routing via GRAPHHOPPER between multiple Points
 * @param {} waypoints - Points which should be visited 
 * @returns {*} - Route as Object (see GRAPHHOPPER Documentation for more Information)
 */
async function get_routing(waypoints) {
  //Prepare the Request-String for GRAPHHOPPER-API (every waypoint has to be in api-request and the api_key of course)
  const API_URL = construct_Graphhopper_URL(waypoints);
  //actual request on GRAPHHOPPER-API
  try {
      const RESPONSE = await fetch(API_URL);
      const DATA = await RESPONSE.json();
      return DATA;
  } 
  catch (error) {
      console.error('Fehler beim GRAPHHOPPER_API-Aufruf:', error);
      return null;
  }
}

ROUTER.post('/routing', async function(req, res) {
  const WAYPOINTS = req.body.waypoints;
  try {
    const ROUTE = await get_routing(WAYPOINTS); 

    if (ROUTE) { 
      res.json(ROUTE); 
    } 
    else {
      res.status(404).json({ message: 'Keine Route gefunden' });
    }
  } 
  catch (err) {
    console.error('Fehler beim Routing einer Tour', err);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
 
});

/**
 * Creates Request-URL for GRAPHHOPPER-API for a bicycle-tour
 * @param {*} waypoints - Array of Points (Lat, Lng) which should be connected
 * @returns {String} - GRAPHHOPPER-URL
 */
function construct_Graphhopper_URL(waypoints) {
  const BASE_URL = "https://graphhopper.com/api/1/route";
  //As the waypoints-Array can contain different amounts of points, it must be stringyfied outside the other PARAMS
  const WAYPOINT_STRING = 'point=' + waypoints.map(wp => `${wp.lat},${wp.lng}`).join('&point=');
  const PARAMS = {
      vehicle: "bike",
      optimize: true,
      points_encoded: false,
      key: API_KEY
  };
  const PARAM_STRING = Object.entries(PARAMS).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");

  return `${BASE_URL}?${WAYPOINT_STRING}&${PARAM_STRING}`;
}

module.exports = ROUTER;

