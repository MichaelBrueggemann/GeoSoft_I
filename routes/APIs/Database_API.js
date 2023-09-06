"use strict"

const { create_MediaWiki_API_URL, fetch_first_sentence } = require("./MediaWiki_API")
const {STATION_SCHEMA, validate_input} = require("../../validation_schemes/station_schemas")
const {TOUR_SCHEMA} = require("../../validation_schemes/tour_schemas")
const EXPRESS = require('express')
const ROUTER = EXPRESS.Router()

// --------------- DATABASE INITIALIZATION ---------------

const { ObjectId } = require('mongodb')
const MONGO_CLIENT = require('mongodb').MongoClient
const DB_URL = 'mongodb://127.0.0.1:/3000' // connection URL
const CLIENT = new MONGO_CLIENT(DB_URL) // mongodb client
const DB_NAME = 'mydatabase' // database name
const COLLECTION_NAME_TOURS = 'touren' // collection name
const COLLECTION_NAME_STATIONS = 'stations' // collection name
let db // Database-Instance where all data is stored
let tour_collection // Collection-Instance to perform database operations on
let station_collection // Collection-Instance to perform database operations on

/**
 * Function to initialize the Database and Collection and store them in global variables for later access.
 */
async function initialize_DB() 
{
  try 
  {
    await CLIENT.connect()
    db = CLIENT.db(DB_NAME)
    
    station_collection = db.collection(COLLECTION_NAME_STATIONS)
    console.log(`Erfolgreich mit '${DB_NAME}.${COLLECTION_NAME_STATIONS}' verbunden`)
    
    tour_collection = db.collection(COLLECTION_NAME_TOURS)
    console.log(`Erfolgreich mit '${DB_NAME}.${COLLECTION_NAME_TOURS}' verbunden\n`)
  }
  catch (error) 
  {
    console.error(error)
  }
}

initialize_DB()

// ------------------- DB-Functions -------------------
/**
 * Adds an item to the desired database collection.
 * @param {*} item - Data to add to the DB.
 * @param {*} collection - DB Collection where the Data should be added to.
 */
async function add_item(item, collection) 
{
  try 
  {
    const RESULT = await collection.insertOne(item)
    console.log('Neues Element in die Datenbank eingefügt')
    console.log('Eingefügte ID:', RESULT.insertedId)
  } 
  catch (error) 
  {
    console.error('Fehler beim Einfügen des Elements in die Datenbank:', error)
  } 
}

/**
 * Returns all items from the desired database collection.
 * @param {*} collection - DB Collection which Data should be returned.
 * @returns {*} - Items from the DB Collection
 */
async function get_items(collection) 
{
  try 
  {
    const VALUES = await collection.find({}).toArray()
    console.log('Alle Werte der Collection abgerufen')
    return VALUES
  } 
  catch (error) 
  {
    console.error('Fehler beim Abrufen der Werte aus der Collection:', error)
    return null
  } 
}

/**
 * Deletes an item from the desired database collection.
 * @param {*} id - Id of the item which should be deleted
 * @param {*} collection - DB Collection where the Data should be deleted.
 */
async function delete_item(id, collection) 
{
  try 
  {
    const RESULT = await collection.deleteOne({ _id: new ObjectId(id) }) // Datensatz anhand der ID löschen

    if (RESULT.deletedCount === 1) 
    {
      return { message: 'Datensatz erfolgreich gelöscht' }
    } 
    else 
    {
      return { message: 'Datensatz nicht gefunden' }
    }
  } catch (error) 
  {
    console.error('Fehler beim Löschen des Datensatzes:', error)
  }
}

/**
 * Updates an item from the desired database collection.
 * @param {*} id - Id of the item which should be updated
 * @param {*} newData - Tour- or Station-Data which should be the new state
 * @param {*} collection - DB Collection where the Data should be updated.
 */
async function update_item(id, newData, collection) 
{
  try 
  {
    // the collections need different kinds of updates
    let result = null
    if (collection === station_collection)
    {
      result = await collection.updateOne(
        { _id: new ObjectId(id) }, 
        { $set: newData.geojson } 
      )
    }
    else if (collection === tour_collection)
    {
      result = await collection.updateOne(
        { _id: new ObjectId(id) }, 
        { $set: newData } 
      )
    }

    if (result.modifiedCount === 1) 
    {
      return { message: 'Datensatz erfolgreich aktualisiert' }
    } 
    else 
    {
      return { message: 'Datensatz nicht gefunden' }
    }
  } 
  catch (error) 
  {
    console.error('Fehler beim Aktualisieren des Datensatzes:', error)
  }
}


// ------------------- Webserver-Routes: Station-Website -------------------

// API calls generally do not want caching because the returned data may change
ROUTER.use(function(req, res, next) 
{
  res.set('Cache-Control', 'no-store')
  next()
})


ROUTER.get('/stations', async function(req, res) 
{
  try 
  {
    const STATIONS = await get_items(station_collection)

    if (STATIONS) 
    {
      res.status(200).json(STATIONS);
    } 
    else 
    {
      res.status(404).json({ message: 'Keine Stationen gefunden' })
    }
  } 
  catch (error) 
  {
    console.error('Fehler beim Abrufen der Stationen:', error)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
})


ROUTER.post('/add_station', async function(req, res) 
{
  try 
  {
    let validation_result = validate_input(req.body, STATION_SCHEMA)
    console.log("valid result", validation_result.errorDetails)

    // request was invalid
    if (validation_result.hasError)
    {
      res.status(422).json({errors: validation_result.errorDetails})
    }
    else
    {
      let url = req.body.properties.url

      try
      {
        if (url.includes(".wikipedia.org/wiki/"))
        {
          let MediaWiki_url = create_MediaWiki_API_URL(url)

          try 
          {
            let first_sentence = await fetch_first_sentence(MediaWiki_url)
            
            // replace description in request body
            req.body.properties.description = first_sentence
          } 
          catch (error) 
          {
            /* If the MediaWiki-APi can't fetch a ressource, the default description set by the user is used. 
            The "wrong" link will still be set in the stations data, as giving the link was a choise by the user. Only behavior that threatens the Website will be stopped.*/
            console.error("Der Link führt nicht zu einer Wikipedia-Seite! Folgender Fehler ist aufgetreten:", error)
          }
        }
      }
      catch (error)
      {
        console.error(error)
      }

      add_item(req.body, station_collection)
      res.status(200).json({errors: "Alles ok."})
    }
  } 
  catch (error) 
  {
    console.error('Fehler beim Hinzufügen der Station:', error)
    res.status(500).json({ errors: 'Interner Serverfehler' })
  }

})

ROUTER.post('/delete_station', async function(req, res) 
{
  
  // To preserve referential integrity, the current tours have to be checked
  let tours = await fetch("http://localhost:3000/api/tours")
  tours = await tours.json();
  const ID = req.body.id;
  
  // when the station that should be deleted is part of a tour, this tour gets saved. This is used to later inform the user about a possible cascading deletion of tours.
  let tours_with_this_station = []
  
  for (const TOUR of tours) 
  {
    TOUR.stations.forEach(function({_id}) 
    {
      if (_id == ID) 
      {
        tours_with_this_station.push(TOUR)
      }
    })
  }
  
  // If the station isnt part of any tour it can simply deleted
  if (tours_with_this_station.length < 1) 
  {
    delete_item(ID, station_collection)
    res.status(200).json({errors: "Alles ok."})
  }
  // Else the client gets Error-Message and the tours which contains this station
  else 
  {
    res.status(409).json(
    {
      message : "referentielle Integrität gefährdet",
      tours_with_this_station : tours_with_this_station
    })
  }
})


ROUTER.post('/update_station', async function(req, res) 
{
  try 
  {
    const ID = req.body.id
    let new_data = { geojson: req.body.geojson }

    let validation_result = validate_input(req.body.geojson, STATION_SCHEMA)

    // request was invalid
    if (validation_result.hasError)
    {
      res.status(422).json({errors: validation_result.errorDetails})
    }
    else
    {
      let url = new_data.geojson.properties.url

      if (url.includes(".wikipedia.org/wiki/"))
      {
        let MediaWiki_url = create_MediaWiki_API_URL(url)
        let first_sentence = await fetch_first_sentence(MediaWiki_url)

        // replace description in new_data
        new_data.geojson.properties.description = first_sentence
      }
      update_item(ID, new_data, station_collection)
      res.status(200).json({errors: "Alles ok."})
    }
  } 
  catch (error) 
  {
    console.error('Fehler beim Update der Station:', error)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }

})

// ------------------- Webserver-Routes: Tour-Website -------------------

ROUTER.get('/tours', async function(req, res) 
{
  try 
  {
    const TOURS = await get_items(tour_collection) 

    if (TOURS) 
    {
      res.status(200).json(TOURS)
    } 
    else 
    {
      res.status(404).json({ message: 'Keine Touren gefunden' })
    }
  } 
  catch (error) 
  {
    console.error('Fehler beim Abrufen der Touren:', error)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
})

ROUTER.post('/add_tour', function(req, res) 
{
  try 
  {
    let validation_result = validate_input(req.body, TOUR_SCHEMA)
    console.log("valid result", validation_result.errorDetails)
    
    // request was invalid
    if (validation_result.hasError)
    {
      res.status(400).json({errors: validation_result.errorDetails})
    }
    else
    {
      add_item(req.body, tour_collection);
      res.status(200).json({errors: "Alles ok."})
    }
  } 
  catch (error) 
  {
    console.error('Fehler beim Hinzufügen der Tour:', error)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
  
})


ROUTER.post('/delete_tour', function(req, res) 
{
  try 
  {
    const ID = req.body.id
    delete_item(ID, tour_collection)
    res.status(200)
  } 
  catch (error) 
  {
    console.error('Fehler beim Löschen der Tour:', error)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
  
})


ROUTER.post('/update_tour', function(req, res) 
{
  try 
  {
    const ID = req.body.id
    let new_data = 
    {
      name: req.body.name,
      stations: req.body.stations,
      segments: req.body.segments,
      instructions: req.body.instructions,
      distance: req.body.distance
    }
    
    let validation_result = validate_input(new_data, TOUR_SCHEMA)

    // request was invalid
    if (validation_result.hasError)
    {
      res.status(400).json({errors: validation_result.errorDetails})
    }
    else
    {
      update_item(ID, new_data, tour_collection)
      res.status(200).json({errors: "Alles ok."})
    }
  } 
  catch (error) 
  {
    console.error('Fehler beim Update der Tour:', error)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
})

module.exports = ROUTER

