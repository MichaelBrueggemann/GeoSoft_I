"use strict"

const PURPLE_MARKER = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }); 
  const BLUE_MARKER  = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

//this site has two modi (edit tours & show stations/tours) in which some elements should behave diffrently
let working_on_tour_mode = false;

let current_stations = [];
let current_tour_id = null;

let tours_collection = {};
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
 * @param {*} newstations - Array with station-objects
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
 * @param {*} newstations - Array with station-objects
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
    // Fill table with route entries
    let table = document.getElementById("tour_table")
    let tbody = document.createElement('tbody')
    
    tours_collection.forEach(function({ _id, name, stations, segments, instructions, distance }) {
        //selection of tours
        let row = tbody.insertRow();
        row.addEventListener("click", async function(event) {
            if (event.target.tagName !== "BUTTON") {// only activates click event, if no button of the row is pressed
                let map = await map_promise;
                map.eachLayer(function(layer) {
                    if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                        map.removeLayer(layer);
                    }
                });
                if (current_tour_id == _id) {
                    current_tour_id = null;
                }
                else {
                    current_tour_id = _id;
                    //calculate Segment_distances
                    let segment_distances = [];
                    let current_distance = 0;
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
                    segments.forEach(function(segment) {
                        let polyline = L.polyline(segment).addTo(tour_layer);
                        polyline.bindPopup("ca. " + Math.round(segment_distances[i]).toString() + "m");
                        i++;
                        polyline.on("mouseover", function(event) {polyline.openPopup();});
                        polyline.on("mouseout", function(event) {polyline.closePopup();});
                    });
                    map.fitBounds(tour_layer.getBounds());
                }
            }
            
        })

        //name
        let tour_name = document.createElement("td");
        tour_name.innerText = name;
        row.insertCell().appendChild(tour_name);

        //Show-Button
        let show_tour_button = document.createElement("button")
        show_tour_button.innerText = "Informationen"
        show_tour_button.setAttribute("type", "button")
        show_tour_button.setAttribute("class", "btn btn-primary")
        show_tour_button.setAttribute("data-toggle", "modal")
        show_tour_button.setAttribute("data-target", "#tour_information_popup")
        
        show_tour_button.addEventListener("click", function() {
            // populate popUp with tour information
            let info_text = "<strong>Stationen:</strong>";
            stations.forEach( function({properties}) {
                    info_text += "<br>" + properties.name;
            })
            
            info_text += "<br><br><strong>Anleitung zur Tour:</strong>"
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
            info_text += "<br>Diese Instruktionen kommen direkt von GRAPHHOPPER und sind somit leider nur auf englisch verfügbar."

            info_text+="<br><br><strong>Gesamtlänge</strong>: "
            info_text+= distance + "m";

            document.getElementById("info_text").innerHTML = info_text;
        })
        
        row.insertCell().appendChild(show_tour_button)

        //Update-Button
        let update_tour_button = document.createElement("button")
        update_tour_button.innerText = "Bearbeiten"
        update_tour_button.setAttribute("type", "button")
        update_tour_button.setAttribute("class", "btn btn-primary")
        update_tour_button.addEventListener("click",async function() {
            start_working_modi();
            current_tour_id = _id;
            let tour_name_input = document.getElementById("tour_name");
            tour_name_input.value = name;
            await update_stationtable(stations);
            //set Highlighting on stations in Tour
            let map = await map_promise;
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

    stat_collection.forEach(function(station) {

        let map_station = L.geoJSON(station, {color: "blue"}).addTo(map);
        let popup_content = `<strong> Name: </strong> ${station.properties.name}  <br> <strong> Beschreibung: </strong> ${station.properties.description}  <br>`
        if (station.properties.url) { // append only if exisitng, as its an optional parameter
            popup_content += `<strong> URL: </strong> <a href="${station.properties.url}" target="_blank"> ${station.properties.url} </a> `
        }
        map_station.bindPopup(popup_content);
        map_station.on("mouseover", function(event) {map_station.openPopup();});
        map_station.on("mouseout", function(event) {map_station.closePopup();});
        map_station.on("click", function(event) {
        if (working_on_tour_mode) {
            if (map_station.options.color == "blue") {
                map_station.options.color = "violet";
                map_station.setStyle({color: "violet"});
                if (station.geometry.type == "Point") {
                    map_station.getLayers()[0].setIcon(PURPLE_MARKER);
                }
            }
            else {
                map_station.options.color = "blue";
                map_station.setStyle({color: "blue"});
                if (station.geometry.type == "Point") {
                    map_station.getLayers()[0].setIcon(BLUE_MARKER);
                }
           }
            update_stationtable([station]);
        }
        else 
        {
            $('#station_selection_help').modal('show');
        let help_text = "Bitte klicken Sie auf -<strong>neue Tour anlegen</strong>- oder in der Tabelle bei der gewünschten Tour auf -<strong>Bearbeiten</strong>-, um Stationen auszuwählen und sie zu Touren zusammenzufügen.";
        document.getElementById("help_text").innerHTML = help_text;
        }
       })
    })

    return map
}

// ----------------- station-table -----------------
async function update_stationtable(stations) {
    //filter current selected (disselected) stations
    stations.forEach(function(station) {
        if (current_stations.map(obj => obj._id).includes(station._id)) {
            current_stations = current_stations.filter(stat => stat._id !== station._id);
        } else {
            current_stations = current_stations.concat(station);
        }
    });
    let table = document.getElementById("selected_station_table")
    let tbody = document.createElement('tbody')
    current_stations.forEach(function({properties}) {
        let row = tbody.insertRow()
        let station_name = document.createElement("td")
        row.insertCell().appendChild(station_name)
        station_name.innerText = properties.name;
    })
    table.tBodies[0].replaceWith(tbody);
}

// ----------------- start Working - Modi -----------------
async function start_working_modi() {
    current_tour_id = null;
    let stat_div = document.getElementById("station_div")
    stat_div.style.display = 'block';
    let tour_div = document.getElementById("tour_div")
    tour_div.style.display = 'none';
    let new_tour_button = document.getElementById("new_tour")
    new_tour_button.style.display = 'none';
    document.getElementById('tour_map').scrollIntoView();
    working_on_tour_mode = true;
    let map = await map_promise;
    map.eachLayer(function(layer) {
        if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            map.removeLayer(layer);
        }
    });
}

// ----------------- stop Working - Modi -----------------
async function stop_working_modi() {
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
    let map = await map_promise;
    map.eachLayer(function(layer) {
        if (layer instanceof L.GeoJSON) {  
            layer.options.color = "blue";
            layer.setStyle({color: "blue"});
        }
        else if (layer instanceof L.Marker) {
            layer.setIcon(BLUE_MARKER);
        }
    })
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
    let waypoints = current_stations.map(function(station) {
        if (station.geometry.type == "Point") {
            return {lat: station.geometry.coordinates[1], lng: station.geometry.coordinates[0]};
        }
        else {
          return calculate_centroid(station.geometry.coordinates);
        }
      });
    let res = await api_call("routing", {
        waypoints: waypoints,
    });
    let route = await res.json();
    //Check result
    if (route.hasOwnProperty("message")) {
        $('#routing_error_popup').modal('show');
        let error_statement = "Leider konnte mit den ausgewählten Stationen keine Tour erstellt werden. <br>";
        error_statement += "Dies könnte beispielsweise daran liegen, dass eine falsche Anzahl von Stationen ausgewählt wurde (min. 2) oder die Stationen nicht via Fahhrad zu verbinden sind. <br>";
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
        sum_lat += VERTEX[1];
        sum_lng += VERTEX[0];
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
    let segments = [[[route[0][1],route[0][0]]]];
    for (let i = 1, j = 1; i < route.length -1; i++) {
        segments[j-1].push([route[i][1],route[i][0]]);
        if(JSON.stringify(route[i]) === JSON.stringify(snapped_waypoints[j])) {
            segments.push([]);
            segments[j].push([route[i][1],route[i][0]]);
            j++;
        }
    }
    let last = snapped_waypoints.length - 1;
    segments[last-1].push([snapped_waypoints[last][1],snapped_waypoints[last][0]]);
    return segments;
}

let map_promise = initializeMap()
update_table()
