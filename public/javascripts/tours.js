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
async function add_new_tour(new_stations, new_segments, new_instructions, new_distance) {
    let tour = {
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
async function update_tour(id, new_stations, new_segments, new_instructions, new_distance) 
{

    await api_call("update_tour", {
            id: id,
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
    
    tours_collection.forEach(({ _id, stations, segments, instructions, distance }) => {
        //id
        let row = tbody.insertRow();
        row.addEventListener("click", async function(event) 
        {
            if (event.target.tagName !== "BUTTON") // only activates click event, if no button of the row is pressed
            {
                let map = await map_promise;
                map.eachLayer((layer) => {
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
                    instructions.forEach( instruction => {
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
                    segments.forEach(segment => {
                        let polyline = L.polyline(segment).addTo(tour_layer);
                        polyline.bindPopup("ca. " + Math.round(segment_distances[i]).toString() + "m");
                        i++;
                        polyline.on("mouseover", (event) => {polyline.openPopup();});
                        polyline.on("mouseout", (event) => {polyline.closePopup();});
                    });
                    map.fitBounds(tour_layer.getBounds());
                }
            }
            
        })
        let tour_id = document.createElement("td")
        tour_id.innerText = _id
        row.insertCell().appendChild(tour_id)

        //Show-Button
        let show_tour_button = document.createElement("button")
        show_tour_button.innerText = "Informationen"
        show_tour_button.setAttribute("type", "button")
        show_tour_button.setAttribute("class", "btn btn-primary")
        show_tour_button.setAttribute("data-toggle", "modal")
        show_tour_button.setAttribute("data-target", "#tour_information_popup")
        
        show_tour_button.addEventListener("click", () => {
            // populate popUp with tour information
            let infotext = "<strong>Stationen:</strong>";
            stations.forEach( ({properties}) => {
                    infotext += "<br>" + properties.name;
            })
            
            infotext += "<br><br><strong>Anleitung zur Tour:</strong>"
            instructions.forEach((instruction) => {
                if(instruction.text.startsWith("Waypoint")) {
                    infotext += "<br><strong>You arrived at one station</strong>";
                }
                else if (instruction.text.startsWith("Arrive at destination")){
                    infotext += "<br><strong>Arrive at destination</strong>";
                }
                else {
                    infotext += "<br>" + instruction.text + " and follow the path for " + Math.round(instruction.distance) + " metres";
                }
            })
            infotext += "<br>Diese Instruktionen kommen direkt von GRAPHHOPPER und sind somit leider nur auf englisch verfügbar."

            infotext+="<br><br><strong>Gesamtlänge</strong>: "
            infotext+= distance + "m";

            document.getElementById("infoText").innerHTML = infotext;
        })
        
        row.insertCell().appendChild(show_tour_button)

        //Update-Button
        let update_tour_button = document.createElement("button")
        update_tour_button.innerText = "Bearbeiten"
        update_tour_button.setAttribute("type", "button")
        update_tour_button.setAttribute("class", "btn btn-primary")
        update_tour_button.addEventListener("click",async () => 
        {
            startWorkingModi();
            current_tour_id = _id;
            await update_stationtable(stations);
            //set Highlighting on stations in Tour
            let map = await map_promise;
            let idTrue = false;
            let pointTrue = false;
            map.eachLayer((layer) => {
                if (idTrue) {
                    layer.options.color = "violet";
                    layer.setStyle({color: "violet"});
                    idTrue = false;
                    if (pointTrue)
                    {
                        layer.getLayers()[0].setIcon(PURPLE_MARKER);
                        pointTrue = false;
                    }
                }
            if (layer.hasOwnProperty('feature') && current_stations.map(obj => obj._id).includes(layer.feature._id)) {  
                idTrue = true;
                if (layer.feature.geometry.type == 'Point') {
                    pointTrue = true;
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
        delete_tour_button.addEventListener("click",() => {
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
    let osmLayer = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {attribution:'&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});

    osmLayer.addTo(map)

    stat_collection.forEach((station) => {

        let mapstation = L.geoJSON(station, {color: "blue"}).addTo(map);
        let popup_content = `<strong> Name: </strong> ${station.properties.name}  <br> <strong> Beschreibung: </strong> ${station.properties.description}  <br>`
        if (station.properties.url) // append only if exisitng, as its an optional parameter
        {
            popup_content += `<strong> URL: </strong> <a href="${station.properties.url}" target="_blank"> ${station.properties.url} </a> `
        }
        mapstation.bindPopup(popup_content);
        mapstation.on("mouseover", (event) => {mapstation.openPopup();});
        mapstation.on("mouseout", (event) => {mapstation.closePopup();});
        mapstation.on("click", (event) => {
        if (working_on_tour_mode){
            if (mapstation.options.color == "blue"){
                mapstation.options.color = "violet";
                mapstation.setStyle({color: "violet"});
                if (station.geometry.type == "Point") mapstation.getLayers()[0].setIcon(PURPLE_MARKER);
            }
            else {
                mapstation.options.color = "blue";
                mapstation.setStyle({color: "blue"});
                if (station.geometry.type == "Point") mapstation.getLayers()[0].setIcon(BLUE_MARKER);
           }
            update_stationtable([station]);
        }
        //else {Teil mit Hilfestellung für Seite}
       })
    })

    return map
}

// ----------------- station-table -----------------
async function update_stationtable(stations) {
    //filter current selected (disselected) stations
    stations.forEach((station) => {
        if (current_stations.map(obj => obj._id).includes(station._id)){
            current_stations = current_stations.filter(stat => stat._id !== station._id);
        } else {current_stations = current_stations.concat(station);}
    });
    let table = document.getElementById("selectedStation_table")
    let tbody = document.createElement('tbody')
    current_stations.forEach(({properties}) => {
        let row = tbody.insertRow()
        let station_name = document.createElement("td")
        row.insertCell().appendChild(station_name)
        station_name.innerText = properties.name;
    })
    table.tBodies[0].replaceWith(tbody);
}

// ----------------- start Working - Modi -----------------
async function startWorkingModi() {
    current_tour_id = null;
    let statdiv = document.getElementById("station_div")
    statdiv.style.display = 'block';
    let tourdiv = document.getElementById("tour_div")
    tourdiv.style.display = 'none';
    let newTourButton = document.getElementById("new_tour")
    newTourButton.style.display = 'none';
    document.getElementById('tour_map').scrollIntoView();
    working_on_tour_mode = true;
    let map = await map_promise;
    map.eachLayer((layer) => {
        if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            map.removeLayer(layer);
        }
    });
}

// ----------------- stop Working - Modi -----------------
async function stopWorkingModi() {
    let statdiv = document.getElementById("station_div")
    statdiv.style.display = 'none';
    let tourdiv = document.getElementById("tour_div")
    tourdiv.style.display = 'block';
    let newTourButton = document.getElementById("new_tour")
    newTourButton.style.display = 'block';
    working_on_tour_mode = false;
    current_stations = [];
    let map = await map_promise;
    map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {  
            layer.options.color = "blue";
            layer.setStyle({color: "blue"});
        }
        else if (layer instanceof L.Marker){
            layer.setIcon(BLUE_MARKER);
        }
    })
    let table = document.getElementById("selectedStation_table")
    let tbody = table.querySelector('tbody');
    let newtbody = document.createElement('tbody');
    if (tbody) table.replaceChild(newtbody, tbody);
}

// ----------------- new Tour - Button -----------------
const NEWTOURBUTTON = document.getElementById("new_tour");
NEWTOURBUTTON.setAttribute("class", "btn btn-primary")
NEWTOURBUTTON.addEventListener("click", () => 
{
    startWorkingModi();
    update_stationtable([]);
})

// ----------------- Cancel - Button -----------------
const CANCELBUTTON = document.getElementById("cancel");
CANCELBUTTON.setAttribute("class", "btn btn-primary")
CANCELBUTTON.addEventListener("click", () => 
{
    stopWorkingModi();
})

// ----------------- Update - Button -----------------
const UPDATEBUTTON = document.getElementById("calculate_tour");
UPDATEBUTTON.setAttribute("class", "btn btn-primary")
UPDATEBUTTON.addEventListener("click", async () => 
{
    //calculate Tour 
    let waypoints = current_stations.map((station) => {
        if (station.geometry.type == "Point"){
            return {lat: station.geometry.coordinates[1], lng: station.geometry.coordinates[0]};
        }
        else{
          return calculateCentroid(station.geometry.coordinates);
        }
      });
    let res = await api_call("routing", {
        waypoints: waypoints,
    });
    let route = await res.json();
    //Check result
    if (route.hasOwnProperty("message")) {
        $('#routing_error_popup').modal('show');
        let errorstatement = "Leider konnte mit den ausgewählten Stationen keine Tour erstellt werden. <br>";
        errorstatement += "Dies könnte beispielsweise daran liegen, dass eine falsche Anzahl von Stationen ausgewählt wurde (min. 2) oder die Stationen nicht via Fahhrad zu verbinden sind. <br>";
        errorstatement += "Aber auch andere Fehler können auftreten und wir bitten um Entschuldigung, dass es nicht geklappt hat. <br>";
        errorstatement += "<br><br>Bitte überprüfen Sie ihre aktuelle Stationenauswahl und versuchen Sie es erneut."
        document.getElementById("errorstatement").innerHTML = errorstatement;
    }
    else {
    //Slicing tour in segments for each waypoint
    let tour_segments = slice_tour(route.paths[0].points.coordinates, route.paths[0].snapped_waypoints.coordinates);
    //save Tour in DB
    if (current_tour_id == null) {
        await add_new_tour(current_stations, tour_segments, route.paths[0].instructions, route.paths[0].distance);
    }
    else {
        await update_tour(current_tour_id, current_stations, tour_segments, route.paths[0].instructions, route.paths[0].distance);
    }
    //select worked-on tour
    let table = document.getElementById('tour_table');
    table.tBodies[0].rows[table.tBodies[0].rows.length - 1].click();
    //change Working Modi
    stopWorkingModi();
    }
})

/**
 * Calculates Centroid of Polygon
 * @param {*} polygon - Polygon-Coordinates from which the Centroid should be derieved
 * @returns {*} - Centroid of Polygon in LatLng-Format
 */
function calculateCentroid(polygon){
    const vertices = polygon[0];
    let sumLat = 0;
    let sumLng = 0;
    for(const vertex of vertices){
        sumLat += vertex[1];
        sumLng += vertex[0];
    }
    const centroidLat = sumLat / vertices.length;
    const centroidLng = sumLng / vertices.length;
    return {lat: centroidLat, lng: centroidLng};
}

/**
 * Slices the Tour-Linecoordinates into segments for each waypoint
 * @param {*} route - Coordinates of the whole Tour
 * @param {*} snapped_waypoints - Snapped Waypoints of the Tour
 * @returns {*} - Coordinates of Toursegments
 */
function slice_tour(route, snapped_waypoints){ 
    let segments = [[[route[0][1],route[0][0]]]];
    for (let i = 1, j = 1; i < route.length -1; i++){
        segments[j-1].push([route[i][1],route[i][0]]);
        if(JSON.stringify(route[i]) === JSON.stringify(snapped_waypoints[j])){
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
