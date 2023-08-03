"use strict"

const REDMARKER = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }); 
  const BLUEMARKER  = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

//this site has two modi (edit tours & show stations/tours) in which some elements should behave diffrently
let tourbearbeitsmodi = false;

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
async function add_new_tour(newstations) {
    let tour = {
        stations: newstations
    }
    await api_call("add_tour", tour);

    await update_table()
}

/**
 * Updates a tour in the DB
 * @param {*} id - ID of the station that should be updated
 * @param {*} newstations - Array with station-objects
 */
async function update_tour(id, newstations) 
{

    await api_call("update_tour", {
            id: id,
            stations: newstations,
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
    
    tours_collection.forEach(({ _id, stations }) => {
        //id
        let row = tbody.insertRow()
        let tour_id = document.createElement("td")
        tour_id.innerText = _id
        row.insertCell().appendChild(tour_id)

        //Show-Button
        let show_tour_button = document.createElement("button")
        show_tour_button.innerText = "Anzeigen"
        show_tour_button.setAttribute("type", "button")
        show_tour_button.setAttribute("class", "btn btn-primary")
        show_tour_button.setAttribute("data-toggle", "modal")
        show_tour_button.setAttribute("data-target", "#tour_information_popup")
        
        show_tour_button.addEventListener("click", () => {
            // populate popUp with tour information
            let infotext = "Stationen:"
            stations.forEach( ({_id}) => {
                let stationid = _id;
                stat_collection.forEach(({ _id, properties }) => {
                    if (_id==stationid) infotext += "<br>" + properties.name;
                })
            })
            
            infotext+= "<br><br>Zu fahrende Route:"
            //ERGÄNZEN!

            infotext+="<br><br>Gesamtlänge:"
            //ERGÄNZEN!

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
            let resmap = await map;
            let idTrue = false;
            let pointTrue = false;
            resmap.eachLayer((layer) => {
                if (idTrue) {
                    layer.options.color = "red";
                    layer.setStyle({color: "red"});
                    idTrue = false;
                    if (pointTrue)
                    {
                        layer.getLayers()[0].setIcon(REDMARKER);
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
        delete_tour_button.addEventListener("click",() => 
        {
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
    let map = new L.map('map2').setView([51.96918, 7.59579], 13)

    // initialize base map
    let osmLayer = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {attribution:'&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});

    osmLayer.addTo(map)

    stat_collection.forEach((station) => {

       let mapstation = L.geoJSON(station, {color: "blue"}).addTo(map);
       mapstation.bindPopup(station.properties.name);
       mapstation.on("mouseover", (event) => {mapstation.openPopup();});
       mapstation.on("click", (event) => {
        if (tourbearbeitsmodi){
            if (mapstation.options.color == "blue"){
                mapstation.options.color = "red";
                mapstation.setStyle({color: "red"});
                if (station.geometry.type == "Point") mapstation.getLayers()[0].setIcon(REDMARKER);
            }
            else {
                mapstation.options.color = "blue";
                mapstation.setStyle({color: "blue"});
                if (station.geometry.type == "Point") mapstation.getLayers()[0].setIcon(BLUEMARKER);
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
    current_stations.forEach(({_id}) => {
        let row = tbody.insertRow()
        let station_name = document.createElement("td")
        row.insertCell().appendChild(station_name)
        let stationid = _id;
                stat_collection.forEach(({ _id, properties }) => {
                    if (_id==stationid) station_name.innerText = properties.name;
                })
    })
    table.tBodies[0].replaceWith(tbody);
}

// ----------------- start Working - Modi -----------------
function startWorkingModi() {
    let statdiv = document.getElementById("station_div")
    statdiv.style.display = 'block';
    let tourdiv = document.getElementById("tour_div")
    tourdiv.style.display = 'none';
    let newTourButton = document.getElementById("new_tour")
    newTourButton.style.display = 'none';
    tourbearbeitsmodi = true;
}

// ----------------- stop Working - Modi -----------------
async function stopWorkingModi() {
    let statdiv = document.getElementById("station_div")
    statdiv.style.display = 'none';
    let tourdiv = document.getElementById("tour_div")
    tourdiv.style.display = 'block';
    let newTourButton = document.getElementById("new_tour")
    newTourButton.style.display = 'block';
    tourbearbeitsmodi = false;
    current_stations = [];
    current_tour_id = null;
    let resmap = await map;
    resmap.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {  
            layer.options.color = "blue";
            layer.setStyle({color: "blue"});
        }
        else if (layer instanceof L.Marker){
            layer.setIcon(BLUEMARKER);
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
    //save Tour in DB
    if (current_tour_id == null) add_new_tour(current_stations);
    else update_tour(current_tour_id, current_stations)
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
    console.log(await route)
    if (route.hasOwnProperty("message")) {
        $('#routing_error_popup').modal('show');
        let errorstatement = "Leider konnte mit den ausgewählten Stationen keine Tour erstellt werden. <br>";
        errorstatement += "Dies könnte beispielsweise daran liegen, dass eine falsche Anzahl von Stationen ausgewählt wurde (min. 2). <br>";
        errorstatement += "Aber auch andere Fehler können auftreten. Diese Errormessage könnte helfen: <br>";
        errorstatement += route.message;
        errorstatement += "<br><br>Bitte überprüfen Sie ihre aktuelle Stationenauswahl und versuchen Sie es erneut."
        document.getElementById("errorstatement").innerHTML = errorstatement;
    }
    else {
    //change Working Modi
    stopWorkingModi();
    //Route anzeigen 
    let tour_segments = slice_route(route.paths[0].points.coordinates, route.paths[0].snapped_waypoints.coordinates);
    console.log(tour_segments);
    let resmap = await map;
    tour_segments.forEach(segment => {
        let polyline = L.polyline(segment).addTo(resmap);
    });

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
function slice_route(route, snapped_waypoints){ 
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

let map = initializeMap()
update_table()