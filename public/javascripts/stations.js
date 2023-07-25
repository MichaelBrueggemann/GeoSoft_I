"use strict"

let station_collection = {};

/**
 * Sends Data to the desired route via HTTP-Post-Request.
 * @param {*} route - API-Endpoint to send the body to.
 * @param {*} body - HTML Request-Body
 */
async function api_call(route, body) {
    await fetch("/api/" + route, {
        method: 'POST',
        headers: {"content-type": "application/json"},
        body: JSON.stringify(body),
    })
}

// ----------------- submit-field -----------------
{
const SUBMIT_BUTTON = document.getElementById("submit_station")
SUBMIT_BUTTON.setAttribute("class", "btn btn-primary")
SUBMIT_BUTTON.addEventListener("click", () => 
{
    const STATION_DATA = JSON.parse(document.getElementById(`add_stationGeoJSON`).value);
    add_new_station(STATION_DATA)
})
}

{
    const UPLOAD_BUTTON = document.getElementById("upload_station")
    UPLOAD_BUTTON.setAttribute("class", "btn btn-primary")
    UPLOAD_BUTTON.setAttribute("data-toggle", "modal")
    UPLOAD_BUTTON.setAttribute("data-target", "#upload_station_popup")

}

/**
 * Deletes a station from the DB
 * @param {*} id - ID of station to delete
 */
async function delete_station(id) {
    await api_call("delete_station", { id: id });

    await update_table();
}

/**
 * Adds a new station to the DB
 * @param {*} geojson - GeoJSON Object defining the station
 */
async function add_new_station(geojson) {
    
    await api_call("add_station", geojson);

    await update_table()
}

/**
 * Updates a station in the DB
 * @param {*} id - ID of the station that should be updated
 * @param {*} geojson - GeoJSON file with data of the station
 */
async function update_station(id, geojson) 
{

    await api_call("update_station", {
            id: id,
            geojson: geojson,
        });

    await update_table();
}

// ----------------- stations-table -----------------

function listen_to_updates(id)
{
    const UPDATED_STATION = JSON.parse(document.getElementById(`update_stationGeoJSON`).value);
    update_station(id, UPDATED_STATION)
}



async function update_table() {
    station_collection = await fetch("/api/stations")
    station_collection = await station_collection.json()

    console.log(station_collection)
    // Fill table with route entries
    let table = document.getElementById("station_table")
    let tbody = document.createElement('tbody')
    
    for(const [id, {geojson}] of Object.entries(station_collection)) 
    {
        let row = tbody.insertRow()
        console.log(geojson)
        let station_name = document.createElement("td")
        station_name.innerText = geojson.properties.name
        station_name.id = `station_name${id}`
        row.insertCell().appendChild(station_name)

        let edit_station_button = document.createElement("button")
        edit_station_button.innerText = "Bearbeiten"
        edit_station_button.setAttribute("type", "button")
        edit_station_button.setAttribute("class", "btn btn-primary")
        edit_station_button.setAttribute("data-toggle", "modal")
        edit_station_button.setAttribute("data-target", "#edit_station_popup")
        
        edit_station_button.addEventListener("click", () => {
            // populate popUp with station data
            let station_update_textarea = document.getElementById("update_stationGeoJSON")
            station_update_textarea.value = JSON.stringify(geojson, null, 2)

            // this button isn't directly added to the table, but is added to a Pop-Up instead.
            let update_station_button = document.getElementById("update_station")

            // overwriting the "onclick" attribute instead of using "addEventListener" fixes the problem, that the "Aktualisieren" Button also updates every other Station in the DB.
            update_station_button.setAttribute("onclick", `listen_to_updates(${id})`)
        })
        row.insertCell().appendChild(edit_station_button)

        let delete_station_button = document.createElement("button")
        delete_station_button.innerText = "Löschen"
        delete_station_button.setAttribute("type", "button")
        delete_station_button.setAttribute("class", "btn btn-primary")
        delete_station_button.addEventListener("click",() => 
        {
            delete_station(id)
        })
        row.insertCell().appendChild(delete_station_button)

        
    }
    
    table.tBodies[0].replaceWith(tbody);
}

// ----------------- Map -----------------
function initializeMap()
{
    // create map-object with initial view set to Münster, Germany
    let map = new L.map('map1').setView([51.96918, 7.59579], 13)

    // initialize base map
    let osmLayer = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {attribution:'&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});

    osmLayer.addTo(map)

    // FeatureGroup is to store editable layers
    let drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // initialize DrawControl Toolbar
    let drawControl = new L.Control.Draw({
        draw: {
            // only allow rectangle and points to be drawn
            polygon: false,
            polyline: false,
            circle: false,
            marker: true,
            circlemarker: false,
            rectagle: true
        },
        edit: {
            featureGroup: drawnItems
        }
    })
    map.addControl(drawControl)

    // save drawn items 
    map.on(L.Draw.Event.CREATED, function (event) 
    {
        // the drawn layer
        let layer = event.layer
        //let type = event.layerType

        // adds drawn layer to the editable layers
        drawnItems.addLayer(layer)
    })
    return map
}

let map = initializeMap()
update_table()
