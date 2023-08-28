"use strict"
import {zip_array_and_leaflet_layergroup, highlight, default_style, add_station_metadata} from "./map_helper.js"

//Highlighted Marker
const PURPLE_MARKER = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
}); 
//Default Marker
const BLUE_MARKER  = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

//this site has two modi (edit tours & show stations/tours) in which some elements should behave diffrently
let working_on_tour_mode = false;

//if you are editing tours, this variable contains all involved stations for the current tour
let current_stations = [];
//This safes which tour is changing (null means its a new tour)
let current_tour_id = null;

//All availible tours are safed in the tours_collection
let tours_collection = {};
//All availible stations are safed in the tours_collection
let stat_collection = {};
/**
 * Stations cant be edited on this site so one initialisation via api is enough
 * So this function gets called within the "map initialisation"
*/
async function init_stations(){
    stat_collection = await fetch("/api/stations");
    stat_collection = await stat_collection.json();
}


/**
 * Sends Data to the desired route via HTTP-Post-Request.
 * @param {*} route - API-Endpoint to send the body to.
 * @param {*} body - HTML Request-Body
 */
async function api_call(route, body) {
    let response = await fetch("/api/" + route, {
        method: 'POST',
        headers: {"content-type": "application/json"},
        body: JSON.stringify(body),
    })
    return response;
}

/**
 * Adds a new tour to the DB
 * @param {*} new_name - name of tour
 * @param {*} new_stations - Array with station-objects
 * @param {*} new_segments - segments of tour
 * @param {*} new_instructions - GRAPHHOPPER-instructions of tour
 * @param {*} new_distance - distance of tour
 */
async function add_new_tour(new_name, new_stations, new_segments, new_instructions, new_distance) {
    let tour = {
        name: new_name,
        stations: new_stations,
        segments: new_segments,
        instructions: new_instructions,
        distance: new_distance
    }
    await api_call("add_tour", tour);

    await update_table()
}

/**
 * Updates a tour in the DB
 * @param {*} id - ID of the station that should be updated
 * @param {*} new_name - name of tour
 * @param {*} new_stations - Array with station-objects
 * @param {*} new_segments - segments of tour
 * @param {*} new_instructions - GRAPHHOPPER-instructions of tour
 * @param {*} new_distance - distance of tour
 */
async function update_tour(id, new_name, new_stations, new_segments, new_instructions, new_distance) {

    await api_call("update_tour", {
            id: id,
            name: new_name,
            stations: new_stations,
            segments: new_segments,
            instructions: new_instructions,
            distance: new_distance
        });

    await update_table();
}

/**
 * Deletes a tour from the DB
 * @param {*} id - ID of tour to delete
 */
async function delete_tour(id) {
    await api_call("delete_tour", { id: id });

    await update_table();
}

// ----------------- tour-table -----------------
async function update_table() {
    tours_collection = await fetch("/api/tours")
    tours_collection = await tours_collection.json()
    // Fill table with tour entries
    let table = document.getElementById("tour_table")
    let tbody = document.createElement('tbody')
    //Each tour gets one row
    tours_collection.forEach(function({ _id, name, stations, segments, instructions, distance }) {
        //selection and highlighting of tours
        let row = tbody.insertRow();
        row.addEventListener("click", async function(event) {
            if (event.target.tagName !== "BUTTON") {// only activates click event, if no button of the row is pressed
                let init_values = await init_values_promise;
                let map = init_values.map;
                //Remove all tours from map
                map.eachLayer(function(layer) {
                    if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                        map.removeLayer(layer);
                    }
                });
                //if a highlighted tour is clicked again it only should be dehighlighted (which happens above)
                if (current_tour_id == _id) {
                    current_tour_id = null;
                }
                else {
                    current_tour_id = _id;
                    //calculate Segment_distances
                    let segment_distances = [];
                    let current_distance = 0;
                    //In GRAPHHOPPER-instructions is distance, so we can add these distances between the waypoints
                    instructions.forEach(function(instruction) {
                        if(instruction.text.startsWith("Waypoint") || instruction.text.startsWith("Arrive at destination")) {
                            segment_distances.push(current_distance);
                            current_distance = 0;
                        }
                        else {
                            current_distance += instruction.distance;
                        }
                    });
                    //Show Tour on Map
                    let i = 0;
                    let tour_layer = L.featureGroup().addTo(map);
                    //each toursegment gets his own Popup (inkl. distance)
                    segments.forEach(function(segment) {
                        let polyline = L.polyline(segment, {color: 'cadetblue', weight: 4}).addTo(tour_layer);
                        polyline.bindPopup("ca. " + Math.round(segment_distances[i]).toString() + "m");
                        i++;
                        polyline.on("mouseover", function(event) {
                            polyline.openPopup();
                            polyline.setStyle({color: 'purple', weight: 7});
                        });
                        polyline.on("mouseout", function(event) {
                            polyline.closePopup();
                            polyline.setStyle({color: 'cadetblue', weight: 4});
                        });
                    });
                    //Zoom on selected tour
                    map.fitBounds(tour_layer.getBounds());
                }
            }
            
        })

        //name
        let tour_name = document.createElement("td");
        tour_name.innerText = name;
        row.insertCell().appendChild(tour_name);

        //Info-Button
        let info_tour_button = document.createElement("button")
        info_tour_button.innerText = "Informationen"
        info_tour_button.setAttribute("type", "button")
        info_tour_button.setAttribute("class", "btn btn-primary")
        info_tour_button.setAttribute("data-bs-toggle", "modal")
        info_tour_button.setAttribute("data-bs-target", "#tour_information_popup")
        
        // populate popUp with tour information
        info_tour_button.addEventListener("click", function() {
            //list all stations of the tour
            let info_text = "<strong>Stationen:</strong>";
            stations.forEach( function({properties}) {
                    info_text += "<br>" + properties.name;
            })
            
            //Tell user instructions how to follow the tour
            info_text += "<br><br><strong>Anleitung zur Tour:</strong>"
            info_text += "<br><div style='border:1px'>Diese Instruktionen kommen direkt von GRAPHHOPPER und sind somit leider nur auf englisch verfügbar.</div>"

            instructions.forEach(function(instruction) {
                if(instruction.text.startsWith("Waypoint")) {
                    info_text += "<br><strong>You arrived at one station</strong>";
                }
                else if (instruction.text.startsWith("Arrive at destination")){
                    info_text += "<br><strong>Arrive at destination</strong>";
                }
                else {
                    info_text += "<br>" + instruction.text + " and follow the path for " + Math.round(instruction.distance) + " metres";
                }
            })
            //Overall distance of tour
            info_text+="<br><br><strong>Gesamtlänge</strong>: "
            info_text+= distance + "m";

            document.getElementById("info_text").innerHTML = info_text;
        })
        
        row.insertCell().appendChild(info_tour_button)

        //Update-Button
        let update_tour_button = document.createElement("button")
        update_tour_button.innerText = "Bearbeiten"
        update_tour_button.setAttribute("type", "button")
        update_tour_button.setAttribute("class", "btn btn-primary")
        update_tour_button.addEventListener("click",async function() {
            start_working_modi();
            current_tour_id = _id;
            //Write name of tour in the inputfield
            let tour_name_input = document.getElementById("tour_name");
            tour_name_input.value = name;
            //Initialize station_table with stations of tour
            await update_stationtable(stations);
            //set Highlighting on stations in Tour
            let init_values = await init_values_promise;
            let map = init_values.map;
            //ugly help-variables, because layer-information are very strange in Leaflet if you add your layers via L.GeoJSON
            //Esplanation of code: the order of layers is always the same and always the feature-layer of the geojson with its information abaut id and geometrytype came direct previously of the layer which defines this features style on the map
            //So you cant directly set Style on the layer which fullfills your whishes, but must do this on the following layer
            let id_true = false;
            let point_true = false;
            map.eachLayer(function(layer) {
                if (id_true) {
                    layer.options.color = "violet";
                    layer.setStyle({color: "violet"});
                    id_true = false;
                    if (point_true) {
                        layer.getLayers()[0].setIcon(PURPLE_MARKER);
                        point_true = false;
                    }
                }
            if (layer.hasOwnProperty('feature') && current_stations.map(obj => obj._id).includes(layer.feature._id)) {  
                id_true = true;
                if (layer.feature.geometry.type == 'Point') {
                    point_true = true;
                }
            }
            })
        })
        
        row.insertCell().appendChild(update_tour_button)

        //Delete-Button
        let delete_tour_button = document.createElement("button")
        delete_tour_button.innerText = "Löschen"
        delete_tour_button.setAttribute("type", "button")
        delete_tour_button.setAttribute("class", "btn btn-primary")
        delete_tour_button.addEventListener("click",function() {
            delete_tour(_id)
        })
        
        row.insertCell().appendChild(delete_tour_button)
    });
    
    table.tBodies[0].replaceWith(tbody);
}

// ----------------- Map -----------------
async function initializeMap()
{
    //init stations
    await init_stations();
    // create map-object with initial view set to Münster, Germany
    let map = new L.map('tour_map').setView([51.96918, 7.59579], 13)

    // initialize base map
    let osm_layer = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {attribution:'&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});

    osm_layer.addTo(map)
    
    // LayerGroup to store stations
    let stations_layer_group = L.layerGroup()
    map.addLayer(stations_layer_group)

    //Show stations on map
    stat_collection.forEach(function(station) {

        if(station.geometry.type === "Point")
        {
            let marker = L.marker([station.geometry.coordinates[1], station.geometry.coordinates[0]]).addTo(stations_layer_group)
            add_station_metadata(station, marker)
            add_station_events(station, marker)
        }
        else if (station.geometry.type === "Polygon")
        {
            // "coordinates" are accessed at index "0" because geoJSOn wrappes the coordinates in an extra array
            let polygon = L.polygon(station.geometry.coordinates[0].map(function(coord) // used to change coords from lng/lat to lat/lng
            {
                return [coord[1], coord[0]]
            })).addTo(stations_layer_group)
            add_station_metadata(station, polygon)
            add_station_events(station, polygon)
        }
    })

    return {
        map: map,
        stations_layer_group: stations_layer_group
    }
}

function add_station_events(station, leaflet_object) {
    //Event for Station-Infos-Popup
    leaflet_object.on("mouseover", function(event) {leaflet_object.openPopup();});
        //Select stations via click 
        leaflet_object.on("click", function(event) {
        //if you are editing a tour change state of station_table
        if (working_on_tour_mode) {
            //if the station wasnt selected before highlight it 
            if (!leaflet_object.highlighted) {
                highlight(leaflet_object);
            }
            //else dehighlight it
            else {
                default_style(leaflet_object);
            }
            update_stationtable([station]);
        }
        //else help the user why he cant select a station when the edit-mode is off
        else 
        {
            $('#station_selection_help').modal('show');
        let help_text = "Bitte klicken Sie auf -<strong>neue Tour anlegen</strong>- oder in der Tabelle bei der gewünschten Tour auf -<strong>Bearbeiten</strong>-, um Stationen auszuwählen und sie zu Touren zusammenzufügen.";
        document.getElementById("help_text").innerHTML = help_text;
        }
       })
}

// ----------------- station-table -----------------
/**
 * This function updates the stationtable which is availible when editing a tour
 * @param {*} stations - Stations which should be added or removed from stationtable
 */
async function update_stationtable(stations) {
    //filter current selected (disselected) stations
    stations.forEach(function(station) {
        //if station is already in current_stations, remove it from there
        if (current_stations.map(obj => obj._id).includes(station._id)) {
            current_stations = current_stations.filter(stat => stat._id !== station._id);
        } 
        //else add it
        else {
            current_stations = current_stations.concat(station);
        }
    });
    let table = document.getElementById("selected_station_table")
    let tbody = document.createElement('tbody')
    //create for each station one row with stations name
    current_stations.forEach(function({properties}) {
        let row = tbody.insertRow()
        let station_name = document.createElement("td")
        row.insertCell().appendChild(station_name)
        station_name.innerText = properties.name;
    })
    table.tBodies[0].replaceWith(tbody);
}

/**
 * This function changes the state of the Website to editing-mode
 */
async function start_working_modi() {
    current_tour_id = null;
    //change visibilitys of html blocks
    let stat_div = document.getElementById("station_div")
    stat_div.style.display = 'block';
    let tour_div = document.getElementById("tour_div")
    tour_div.style.display = 'none';
    let new_tour_button = document.getElementById("new_tour")
    new_tour_button.style.display = 'none';
    //scroll website to the map (there you can select the stations)
    document.getElementById('tour_map').scrollIntoView();
    working_on_tour_mode = true;
    let init_values = await init_values_promise;
    let map = init_values.map;
    //remove in table selected tour because if it stays on the map it confuses
    map.eachLayer(function(layer) {
        if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            map.removeLayer(layer);
        }
    });
}

/**
 * This function changes the state of the Website to default no-editing-mode
 */
async function stop_working_modi() {
    //change visibilitys of html blocks
    let stat_div = document.getElementById("station_div")
    stat_div.style.display = 'none';
    let tour_div = document.getElementById("tour_div")
    tour_div.style.display = 'block';
    let new_tour_button = document.getElementById("new_tour")
    new_tour_button.style.display = 'block';
    let tour_name_input = document.getElementById("tour_name");
    tour_name_input.value = null;
    
    working_on_tour_mode = false;
    current_stations = [];
    //change style of all stations to default
    let init_values = await init_values_promise;
    let stations_layer_group = await init_values.stations_layer_group;
    stations_layer_group.getLayers().forEach(function(layer) {
        default_style(layer);
    });
    //clear selected_station_table
    let table = document.getElementById("selected_station_table")
    let tbody = table.querySelector('tbody');
    let new_tbody = document.createElement('tbody');
    if (tbody) {
        table.replaceChild(new_tbody, tbody);
    }
}

// ----------------- new Tour - Button -----------------
const NEW_TOUR_BUTTON = document.getElementById("new_tour");
NEW_TOUR_BUTTON.setAttribute("class", "btn btn-primary")
NEW_TOUR_BUTTON.addEventListener("click", function() {
    start_working_modi();
    update_stationtable([]);
})

// ----------------- Cancel - Button -----------------
const CANCEL_BUTTON = document.getElementById("cancel");
CANCEL_BUTTON.setAttribute("class", "btn btn-primary")
CANCEL_BUTTON.addEventListener("click", function() {
    stop_working_modi();
})

// ----------------- Update - Button -----------------
const UPDATE_BUTTON = document.getElementById("calculate_tour");
UPDATE_BUTTON.setAttribute("class", "btn btn-primary")
UPDATE_BUTTON.addEventListener("click", async function() {
    //calculate Tour 
    //simplify stations to one point in {lat, lng}-format
    let waypoints = current_stations.map(function(station) {
        if (station.geometry.type == "Point") {
            return {lat: station.geometry.coordinates[1], lng: station.geometry.coordinates[0]};
        }
        //if the station isnt a point its a polygon and gets simplified to the centroid
        else {
          return calculate_centroid(station.geometry.coordinates);
        }
      });
      //server-call for calculating tour
    let res = await api_call("routing", {
        waypoints: waypoints,
    });
    let route = await res.json();
    //Check result
    if (route.hasOwnProperty("message")) {
        $('#routing_error_popup').modal('show');
        let error_statement = "Leider konnte mit den ausgewählten Stationen keine Tour erstellt werden. <br>";
        error_statement += "Dies könnte beispielsweise daran liegen, dass eine falsche Anzahl von Stationen ausgewählt wurde (min. 2) oder die Stationen nicht via Fahrrad zu verbinden sind. <br>";
        error_statement += "Aber auch andere Fehler können auftreten und wir bitten um Entschuldigung, dass es nicht geklappt hat. <br>";
        error_statement += "<br><br>Bitte überprüfen Sie ihre aktuelle Stationenauswahl und versuchen Sie es erneut."
        document.getElementById("error_statement").innerHTML = error_statement;
    }
    else {
    //Slicing tour in segments for each waypoint
    let tour_segments = slice_tour(route.paths[0].points.coordinates, route.paths[0].snapped_waypoints.coordinates);
    //Get Tourname from input-field
    let tour_name = document.getElementById("tour_name").value;
    //save Tour in DB
    if (current_tour_id == null) {
        await add_new_tour(tour_name, current_stations, tour_segments, route.paths[0].instructions, route.paths[0].distance);
    }
    else {
        await update_tour(current_tour_id, tour_name, current_stations, tour_segments, route.paths[0].instructions, route.paths[0].distance);
    }
    //select worked-on tour
    let table = document.getElementById('tour_table');
    table.tBodies[0].rows[table.tBodies[0].rows.length - 1].click();
    //change Working Modi
    stop_working_modi();
    }
})

/**
 * Calculates Centroid of Polygon
 * @param {*} polygon - Polygon-Coordinates from which the Centroid should be derieved
 * @returns {*} - Centroid of Polygon in LatLng-Format
 */
function calculate_centroid(polygon) {
    const VERTICES = polygon[0];
    let sum_lat = 0;
    let sum_lng = 0;
    for(const VERTEX of VERTICES) {
        sum_lat += parseFloat(VERTEX[1]);
        sum_lng += parseFloat(VERTEX[0]);
    }
    const CENTROID_LAT = sum_lat / VERTICES.length;
    const CENTROID_LNG = sum_lng / VERTICES.length;
    return {lat: CENTROID_LAT, lng: CENTROID_LNG};
}

/**
 * Slices the Tour-Linecoordinates into segments for each waypoint
 * @param {*} route - Coordinates of the whole Tour
 * @param {*} snapped_waypoints - Snapped Waypoints of the Tour
 * @returns {*} - Coordinates of Toursegments
 */
function slice_tour(route, snapped_waypoints) { 
    //first point of whole tour = first point of first segment of tour
    let segments = [[[route[0][1],route[0][0]]]];
    //tour_point_index represents the index of the points of the whole tour (not the first and the last)
    for (let tour_point_index = 1, segment_count = 1; tour_point_index < route.length -1; tour_point_index++) {
        //add the point with current index to the segment with current index (= count-1)
        segments[segment_count-1].push([route[tour_point_index][1],route[tour_point_index][0]]);
        //if a waypoint is reached create a new segment push the point with current index also in this segment
        if(JSON.stringify(route[tour_point_index]) === JSON.stringify(snapped_waypoints[segment_count])) {
            segments.push([]);
            segments[segment_count].push([route[tour_point_index][1],route[tour_point_index][0]]);
            segment_count++;
        }
    }
    //add the last point to the last segment
    let last = snapped_waypoints.length - 1;
    segments[last-1].push([snapped_waypoints[last][1],snapped_waypoints[last][0]]);
    return segments;
}

let init_values_promise = initializeMap();
update_table();
