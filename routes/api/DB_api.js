"use strict"


const {GEOJSON_SCHEMA, validate_input} = require("../validation_schemes/joi_schemas")
const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();




// --------------- DATABASE INITIALIZATION ---------------

const { ObjectId } = require('mongodb');
const MONGO_CLIENT = require('mongodb').MongoClient;
const DB_URL = 'mongodb://127.0.0.1:/3000'; // connection URL
const CLIENT = new MONGO_CLIENT(DB_URL); // mongodb client
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


ROUTER.post('/add_station', function(req, res) {
  let validation_result = validate_input(req.body, GEOJSON_SCHEMA)
  console.log("valid result", validation_result.errorDetails)

  // request was invalid
  if (validation_result.hasError)
  {
    res.status(400).json({errors: validation_result.errorDetails})
  }
  else
  {
    add_item(req.body, station_collection);
    res.status(200).json({errors: "Alles ok."})
  }
  
});

ROUTER.post('/delete_station', async function(req, res) {
  // To preserve referential integrity, the current tours have to be checked
  let tours = await fetch("http://localhost:3000/api/tours");
  tours = await tours.json();
  const ID = req.body.id;
  // when the station that should be deleted is part of a tour, this tour gets saved. This is used to later inform the user about a possible cascading deletion of tours.
  let tours_with_this_station = [];
  tours.forEach(function(tour) {
    tour.stations.forEach(function({_id}) {
      if (_id == ID) {
        tours_with_this_station.push(tour);
      }
    });
  });
  // If the station isnt part of any tour it can simply deleted
  if (tours_with_this_station.length < 1) {
    delete_item(ID, station_collection);
    res.json({
      message : "Alles ok."
    });
  }
  // Else the client gets Error-Message and the tours which contains this station
  else {
    res.json({
      message : "referentielle Integrität gefährdet",
      tours_with_this_station : tours_with_this_station
    });
  }
});


ROUTER.post('/update_station', function(req, res) {

  const ID = req.body.id;
  let new_data = {
    geojson: req.body.geojson
  }

  let validation_result = validate_input(req.body.geojson, GEOJSON_SCHEMA)

  // request was invalid
  if (validation_result.hasError)
  {
    res.status(400).json({errors: validation_result.errorDetails})
  }
  else
  {
    update_item(ID, new_data, station_collection)
    res.status(200).json({errors: "Alles ok."})
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

module.exports = ROUTER;

