"use strict"

const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();
const DOTENV = require('dotenv');
const URL = require('url');

// ------------------- Routing-Routes: Tour-Website -> Graphhopper -------------------
// Load enviroment(API_KEY) from .env file
DOTENV.config();
const API_KEY = process.env.GRAPHHOPPER_API_KEY;

/**
 * Routing via GRAPHHOPPER between multiple Points
 * @param {} waypoints - Points which should be visited 
 * @returns {*} - Route as Object (see GRAPHHOPPER Documentation for more Information)
 */
async function get_routing(waypoints) {
  // Prepare the Request-String for GRAPHHOPPER-API (every waypoint has to be in api-request and the api_key of course)
  const API_URL = construct_Graphhopper_URL(waypoints);
  // actual request on GRAPHHOPPER-API
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

ROUTER.post('/get_routing', async function(req, res) {
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
  // create URL with protokoll, domain and path
  const BASE_URL = "https://graphhopper.com/api/1/route";
  let url = new URL.URL(BASE_URL);
  // Routing should be for bicycles
  url.searchParams.set("vehicle", "bike");
  // The order in which the stations should be visited is not important, so can be optimized
  url.searchParams.set("optimize", true);
  // its easyer to work with the result if its decoded
  url.searchParams.set("points_encoded", false);
  // The API_KEY is required
  url.searchParams.set("key", API_KEY);
  // Every waypoint has to be added to the request-url
  for(let waypoint of waypoints){
    let lat = waypoint.lat;
    let lng = waypoint.lng;
    let point_string = lat.toString() +',' + lng.toString();
    url.searchParams.append("point", point_string);
  }
  return url;
}

module.exports = ROUTER;