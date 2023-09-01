"use strict"
import {highlight, default_style, add_station_metadata} from "./map_helper.js"
import {build_info_text, calculate_centroid, get_routing_error_text, slice_tour} from "./tour_helper.js";

// ------------ Definition & Initialization of global variables -------------
//This site has two Modi (edit tours & show stations/tours) in which some elements should behave differently
let working_on_tour_mode = false;

//If you are editing tours, this variable contains all involved stations for the current tour
let current_stations = [];
//This safes which tour is highlighted or changing (null means nothing is highlighted and while creating its a new tour)
let current_tour_id = null;

//All available tours are saved in the tours_collection
let tours_collection = {};
//All available stations are saved in the tours_collection
let stat_collection = {};

/**
 * Stations cant be edited on this site so one initialisation via api is enough
 * So this function gets called within the "map initialization"
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
    //Synchronize local tour_collection with DB via api
    tours_collection = await fetch("/api/tours")
    tours_collection = await tours_collection.json()
    // Fill table with tour entries
    let table = document.getElementById("tour_table")
    let tbody = document.createElement('tbody')
    //Each tour gets his one row
    tours_collection.forEach(function({ _id, name, stations, segments, instructions, distance }) {
        let row = tbody.insertRow();
        // ---- selection and highlighting of tours ----
        row.addEventListener("click", async function(event) {
            row_click_event_handling(row, event, _id, instructions, segments);
        });

        // ---- invisible id for other methods (f. e. highlighting) ----
        row.setAttribute("_id", _id);

        // ---- name ----
        let tour_name = document.createElement("td");
        tour_name.innerText = name;
        row.insertCell().appendChild(tour_name);

        // ---- Info-Button ----
        let info_tour_button = document.createElement("button")
        info_tour_button.innerText = "Informationen"
        info_tour_button.setAttribute("type", "button")
        info_tour_button.setAttribute("class", "btn btn-primary")
        info_tour_button.setAttribute("data-bs-toggle", "modal")
        info_tour_button.setAttribute("data-bs-target", "#tour_information_popup")
        
        // populate popUp with tour information
        info_tour_button.addEventListener("click", function() {
            let info_text = build_info_text(stations, instructions, distance);
            document.getElementById("info_text").innerHTML = info_text;
        })   
        row.insertCell().appendChild(info_tour_button)

        // ---- Update-Button ----
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
            //get access to map
            let init_values = await init_values_promise;
            let stations_layer_group = init_values.stations_layer_group;
            //set highlighting on stations in Tour
            stations_layer_group.eachLayer(function(layer) {
                if (current_stations.map(obj => obj._id).includes(layer._id)) {  
                    highlight(layer);
                }
            })
        })
        row.insertCell().appendChild(update_tour_button)

        // ---- Delete-Button ----
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
            marker._id = station._id;
        }
        else if (station.geometry.type === "Polygon")
        {
            // "coordinates" are accessed at index "0" because geoJSON wrappes the coordinates in an extra array
            let polygon = L.polygon(station.geometry.coordinates[0].map(function(coord) {// used to change coords from lng/lat to lat/lng
                return [coord[1], coord[0]]
            })).addTo(stations_layer_group)
            add_station_metadata(station, polygon)
            add_station_events(station, polygon)
            polygon._id = station._id;
        }
    })

    return {
        map: map,
        stations_layer_group: stations_layer_group
    }
}

/**
 * This function adds needed event-listener to stations respectivley their representational leaflet_objects
 * @param {*} station - station which should get the eventlistener
 * @param {*} leaflet_object - leaflet_object of station which should get the eventlistener
 */
function add_station_events(station, leaflet_object) {
    //Event for Station-Infos-Popup
    leaflet_object.on("mouseover", function(event) {leaflet_object.openPopup();});
        //Select stations via click 
        leaflet_object.on("click", function(event) {
            //if you are editing a tour -> change state of station_table
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
            //help the user why he cant select a station when the edit-mode is off
            else {
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
    //set global variables
    current_tour_id = null;
    working_on_tour_mode = true;
    //change visibilitys of html blocks
    let stat_div = document.getElementById("station_div")
    stat_div.style.display = 'block';
    let tour_div = document.getElementById("tour_div")
    tour_div.style.display = 'none';
    let new_tour_button = document.getElementById("new_tour")
    new_tour_button.style.display = 'none';
    //scroll website to the map (there you can select the stations)
    document.getElementById('tour_map').scrollIntoView();
    //reset tour selection in table and on map
    dehighlight_tours()
}

/**
 * This function changes the state of the Website to default no-editing-mode
 */
async function stop_working_modi() {
    //set global variables
    working_on_tour_mode = false;
    current_stations = [];
    //change visibilitys of html blocks
    let stat_div = document.getElementById("station_div")
    stat_div.style.display = 'none';
    let tour_div = document.getElementById("tour_div")
    tour_div.style.display = 'block';
    let new_tour_button = document.getElementById("new_tour")
    new_tour_button.style.display = 'block';
    //reset name field in stat_div
    let tour_name_input = document.getElementById("tour_name");
    tour_name_input.value = null;
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

/**
 * This function handles the "click"-event on a row of the tour_table:
 * Tours (dis)apearing on the map and their segments have Popups with distances
 * 
 * @param {*} row - row that is clicked
 * @param {*} event - click-event on the row
 * @param {*} _id - _id of the tour which is clicked on
 * @param {*} instructions - instructions of the tour which is clicked on
 * @param {*} segments - segments of the tour which is clicked on
 */
async function row_click_event_handling(row, event, _id, instructions, segments) {
    if (event.target.tagName !== "BUTTON") {// only activates click event, if no button of the row is pressed
        //Dehighlight Tours in table and on map
        await dehighlight_tours();
        //if a highlighted tour is clicked again it only should be dehighlighted (which happens above)
        if (current_tour_id == _id) {
            current_tour_id = null;
        }
        else {
            current_tour_id = _id;
            //highlight row in table
            row.setAttribute("class", "table-primary"); 
            //calculate Segment_distances and store them in an array
            let segment_distances = [];
            let current_distance = 0;
            //In GRAPHHOPPER-instructions is distance, so we can add these instead of calculate it costly
            instructions.forEach(function(instruction) {
                // We want the distances seperated by the waypoints 
                if(instruction.text.startsWith("Waypoint") || instruction.text.startsWith("Arrive at destination")) {
                    segment_distances.push(current_distance);
                    current_distance = 0;
                }
                else {
                    current_distance += instruction.distance;
                }
            });
            //Show Tour on Map
            //get access to the map
            let init_values = await init_values_promise;
            let map = init_values.map;
            let i = 0;
            let tour_layer = L.featureGroup().addTo(map);
            //each toursegment gets his own Popup (incl. distance)
            segments.forEach(function(segment) {
                let polyline = L.polyline(segment, {color: 'cadetblue', weight: 4}).addTo(tour_layer);
                polyline.bindPopup("Distanz: ca. " + Math.round(segment_distances[i]).toString() + "m");
                i++;
                //The Popup opens while hovering above the line-segment
                polyline.on("mouseover", function(event) {
                    polyline.openPopup();
                    //The current segment gets highlighted for visualization and easier hovering (weighting)
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
    
}

/**
 * This function deletes all tours from the map view
 * and sets all table colors on default
 */
async function dehighlight_tours() {
    //get map of tour-website
    let init_values = await init_values_promise;
    let map = init_values.map;
    //remove in tour_table selected tour (because if it stays on the map it confuses)
    map.eachLayer(function(layer) {
        if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            map.removeLayer(layer);
        }
    });
    //get rows of tour_table
    let table = document.getElementById('tour_table');
    const ROWS = table.tBodies[0].querySelectorAll("tr");
    //set all rows in the table on default color
    ROWS.forEach(function(row) {
        row.setAttribute("class", ""); 
    });
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
const CALCULATE_BUTTON = document.getElementById("calculate_tour");
CALCULATE_BUTTON.setAttribute("class", "btn btn-primary")
CALCULATE_BUTTON.addEventListener("click", async function() {
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
    let res = await api_call("routing/get_routing", {
        waypoints: waypoints,
    });
    let route = await res.json();
    //Check result
    if (route.hasOwnProperty("message")) {
        get_routing_error_text(route.message);
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
        //select the updated Tour for auto-highlight after successful worked-on
        let table = document.getElementById('tour_table');
        let tbody = table.tBodies[0];
        if (current_tour_id == null) {
            //if a new tour created we can simply highlight the last tour because it gets appended in the tour_table
            tbody.rows[table.tBodies[0].rows.length - 1].click();
        }
        else { 
            //else we search the right row via id comparision
            for(const ROW of tbody.rows) {
                if (ROW.getAttribute("_id") == current_tour_id) {
                    current_tour_id = null;
                    ROW.click();
                }
            };
        }
        //change Working Modi
        stop_working_modi();
    }
})

//save map and layerGroup as promise in global variable and init Website
let init_values_promise = initializeMap();
update_table();
