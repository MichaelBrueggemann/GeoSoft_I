"use strict"

const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();
const DOTENV = require('dotenv');
const MULTER  = require('multer')
const UPLOAD = MULTER({ dest: '../public/data/uploads' }) // store files send to the API and make them accessible
const FS = require('fs') // Read files from the file system


// --------------- DATABASE INITIALIZATION ---------------

const { ObjectId } = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const URL = 'mongodb://127.0.0.1:/3000'; // connection URL
const CLIENT = new MongoClient(URL); // mongodb client
const DBNAME = 'mydatabase'; // database name
const COLLECTIONNAMETOURS = 'touren'; // collection name
const COLLECTIONNAMESTATIONS = 'stations'; // collection name
let db // Database-Instance where all data is stored
let tour_collection; // Collection-Instance to perform database operations on
let station_collection; // Collection-Instance to perform database operations on

/**
 * Function to initialize the Database and Collection and store them in global variables for later access.
 */
async function initializeDB()
{
  try
  {
    await CLIENT.connect();
    db = CLIENT.db(DBNAME);
    station_collection = db.collection(COLLECTIONNAMESTATIONS);
    console.log(`Erfolgreich mit '${DBNAME}.${COLLECTIONNAMESTATIONS}' verbunden`);
    tour_collection = db.collection(COLLECTIONNAMETOURS);
    console.log(`Erfolgreich mit '${DBNAME}.${COLLECTIONNAMETOURS}' verbunden`);

    //Test-Data
    add_item(test_station, station_collection)
    add_item(test_station2, station_collection)
    
    add_item(test_tour,tour_collection);
    
  }
  catch (err)
  {
    console.log(err)
  }
}

initializeDB()

// Debugging

let test_station = {
  type: "Feature",
  properties:
  {
    name: "GEO1",
    description: "Ich bin eine Teststation",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  geometry:
  {
    coordinates: 
    [
      7.597732042580437,
      51.96943649024783
    ],
    type: "Point"
  }
}


let test_station2 = {
  "type": "Feature",
  "properties": {
    "name": "Teststation 2",
    "description": "Ich bin eine Teststation vom Typ Polygon",
    "url": "https://www.youtube.com/watch?v=o-YBDTqX_ZU"
  },
  "geometry": {
    "coordinates": [
      [
        [7.595732042580437, 51.96943649024783],
        [7.595016612243652, 51.96851431845511],
        [7.594695972442627, 51.96851431845511],
        [7.595732042580437, 51.96943649024783]
      ]
    ],
    "type": "Polygon"
  }}

let test_tour = {
  stations: [{_id: "64c8cea86b64b7fa471727c0"}, {_id: "64c8cea86b64b7fa471727c1"}]
}



// ------------------- DB-Functions -------------------
/**
 * Adds an item to the desired database collection.
 * @param {*} item - Data to add to the DB.
 * @param {*} collection - DB Collection where the Data should be added to.
 */
async function add_item(item, collection)
{
  try {
    const result = await collection.insertOne(item);
    console.log('Neues Element in die Datenbank eingefügt');
    console.log('Eingefügte ID:', result.insertedId);
  } catch (err) {
    console.error('Fehler beim Einfügen des Elements in die Datenbank:', err);
  } 
}

/**
 * Returns all items from the desired database collection.
 * @param {*} collection - DB Collection which Data should be returnt.
 * @returns {*} - Items from the DB Collection
 */
async function get_items(collection) {
  try {
      const values = await collection.find({}).toArray();
      console.log('Alle Werte der Collection abgerufen');
      return values;
    } catch (err) {
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
    const result = await collection.deleteOne({ _id: new ObjectId(id) }); // Datensatz anhand der ID löschen

    if (result.deletedCount === 1) {
      return { message: 'Datensatz erfolgreich gelöscht' };
    } else {
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
    const result = await collection.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: newData } 
    );

    if (result.modifiedCount === 1) {
      return { message: 'Datensatz erfolgreich aktualisiert' };
    } else {
      return { message: 'Datensatz nicht gefunden' };
    }
  } catch (err) {
    console.error('Fehler beim Aktualisieren des Datensatzes:', err);
  }
}


// ------------------- Webserver-Routes: Station-Website -------------------

// API calls generally do not want caching because the returned data may change
ROUTER.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})


ROUTER.get('/stations', async function(_req, res)
{
  try {
    const stations = await get_items(station_collection); 

    if (stations) {
      res.json(stations); 
    } else {
      res.status(404).json({ message: 'Keine Stationen gefunden' });
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Stationen:', err);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
})



ROUTER.post('/add_station', function(req, res) {
  add_item(req.body, station_collection);

  res.send()
});

ROUTER.post('/upload_geojson_station', UPLOAD.single("file"), function(req, res) {

  // Read the file from file system 
  FS.readFile(req.file.path, 'utf8', function(err, data){
    if (err) {
      console.error(err);
      return res.status(500).send('Beim Lesen der Datei is ein Fehler aufgetreten')
    }
    // Parse the file content to a JavaScript object
    const FILE_CONTENT = JSON.parse(data);
    
    // add file content to DB
    add_item(FILE_CONTENT, station_collection)
    res.status(200).send({ success: true, message: 'Upload Completed!' })
  })
  
})


ROUTER.post('/delete_station', function(req, res) {
  const ID = req.body.id;
  delete_item(ID, station_collection);
  res.send();
});


ROUTER.post('/update_station', function(req, res) {
  const ID = req.body.id;
  let newData = {
    geojson: req.body.geojson
  };
    
    update_item(ID, newData, station_collection);
    res.send()
});

// ------------------- Webserver-Routes: Tour-Website -------------------


ROUTER.get('/tours', async function(_req, res)
{
  try {
    const tours = await get_items(tour_collection); 

    if (tours) {
      res.json(tours); 
    } else {
      res.status(404).json({ message: 'Keine Touren gefunden' });
    }
  } catch (err) {
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
  let newData = {
    stations: req.body.stations
  };
    
    update_item(ID, newData, tour_collection);
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
async function getRouting(waypoints){
  //Prepare the Request-String for GRAPHHOPPER-API
  const API_URL = `https://graphhopper.com/api/1/route?point=${waypoints.map(wp => `${wp.lat},${wp.lng}`).join('&point=')}&vehicle=bike&optimize="true"&points_encoded=false&key=${API_KEY}`;

  try {
      const response = await fetch(API_URL);
      const DATA = await response.json();
      return DATA;
  } catch (error) {
      console.error('Fehler beim GRAPHHOPPER_API-Aufruf:', error);
      return null;
  }
}

ROUTER.post('/routing', async function(req, res) {
  const waypoints = req.body.waypoints;
  try {
    const route = await getRouting(waypoints); 

    if (route) { 
      res.json(route); 
    } else {
      res.status(404).json({ message: 'Keine Route gefunden' });
    }
  } catch (err) {
    console.error('Fehler beim Routing einer Tour', err);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
 
});

module.exports = ROUTER;