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
let submit_button = document.getElementById("submit_station")
submit_button.addEventListener("click", () => 
{
    const GEOJSON = JSON.parse(document.getElementById(`add_stationGeoJSON`).value);
    add_new_station(GEOJSON)
})



/**
 * Deletes a station from the DB
 * @param {*} id - ID of station to delete
 */
async function delete_station(id) {
    await api_call("delete_station", { id: id });

    await update_table();
}

async function add_new_station(geojson) {
    
    await api_call("add_station", geojson);

    await update_table()
}

// ----------------- stations-table -----------------




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
        
        let station_name = document.createElement("td")
        station_name.innerText = geojson.properties.name
        station_name.id = `station_name${id}`
        row.insertCell().appendChild(station_name)

        let edit_station_button = document.createElement("button")
        edit_station_button.innerText = "Bearbeiten"
        edit_station_button.setAttribute("type", "button")
        edit_station_button.addEventListener("click", () => {
            // opens a PopUp to later update the station data
            const modal = document.getElementById("modal")
            modal.showModal()
        })
        row.insertCell().appendChild(edit_station_button)

        let delete_station_button = document.createElement("button")
        delete_station_button.innerText = "Löschen"
        delete_station_button.setAttribute("type", "button")
        delete_station_button.addEventListener("click",() => 
        {
            delete_station(id)
        })
        row.appendChild(delete_station_button)
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