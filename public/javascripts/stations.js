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

/**
 * Deletes a station from the DB
 * @param {*} id - ID of station to delete
 */
async function delete_station(id) {
    await api_call("delete_station", { id: id })

    await update_map()
    await update_table()
    
}

/**
 * Adds a new station to the DB
 * @param {*} geojson - GeoJSON Object defining the station
 */
async function add_new_station(geojson) {
    
    await api_call("add_station", geojson)

    await update_map()
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

    
    await update_map()
    await update_table()
    
}

// ----------------- Stations Table -----------------
/**
 * Updates station data in the DB.
 * @param {*} id - ID of the station that should be updated
 */
function listen_to_updates(id)
{
    const UPDATED_STATION = JSON.parse(document.getElementById(`update_stationGeoJSON`).value);
    update_station(id, UPDATED_STATION)
}

export async function update_table() {
    station_collection = await fetch("/api/stations")
    station_collection = await station_collection.json()

    // Fill table with route entries
    let table = document.getElementById("station_table")
    let tbody = document.createElement('tbody')

    let stations_data = zip_array_and_leaflet_layergroup(Object.entries(station_collection), stations_layer_group)
    
    for (const [id, {geojson}, layer] of stations_data) 
    {
        let row = tbody.insertRow()
        row.addEventListener("click", function(event) 
        {
            if (!(event.target.tagName === "BUTTON")) // only activates click event, if no button of the row is pressed
            {
                // reset styling of each layer
                stations_layer_group.eachLayer(function(layer)
                {
                    default_styling(layer)
                })
                highlight_station(layer)
            }
            
        })
        let station_name = document.createElement("td")
        station_name.innerText = geojson.properties.name
        station_name.id = `station_name${id}` // TODO: evtl löschen, da nicht genutzt
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

            /* overwriting the "onclick" attribute instead of using "addEventListener" fixes 
            the problem, that the "Aktualisieren" Button also updates every other Station in the DB.*/
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

    // LayerGroup to later store stations
    let stations_layer_group = L.layerGroup()
    map.addLayer(stations_layer_group)

    // initialize DrawControl Toolbar
    let drawControl = new L.Control.Draw({
        draw: {
            // only allow polygon and points to be drawn
            polygon: true,
            polyline: false,
            circle: false,
            marker: true,
            circlemarker: false,
            rectangle: false
        },
        edit: {
            featureGroup: drawnItems
        }
    })
    map.addControl(drawControl)

    // save drawn items 
    map.on(L.Draw.Event.CREATED, function (event) 
    {
        // clears all Elements that were drawn before
        drawnItems.clearLayers() 

        // the drawn layer
        let layer = event.layer
        //let type = event.layerType

        // adds drawn layer to the editable layers
        drawnItems.addLayer(layer)

        // adds the geojson of the layer to the textarea, so that users can edit the metadata
        let textarea = document.getElementById("textarea_geoJSON")
        textarea.value = JSON.stringify(layer.toGeoJSON(), null, 2);
    })
    return {
        map: map,
        stations_layer_group: stations_layer_group,
        drawnItems: drawnItems
    }
}

/**
 * Updates the stations displayed on the map (markers and Pop-Ups)
 */
export async function update_map()
{
    // TODO: evtl so anpassen, dass nur die ausgewählte Station auf der Karte angezeigt wird
    station_collection = await fetch("/api/stations")
    station_collection = await station_collection.json()

    // reset layer, if it exists
    if (stations_layer_group)
    {
        stations_layer_group.clearLayers()
    }

    for (const STATION of Object.values(station_collection))
    {
        if (STATION.geojson.geometry.type === "Point")
        {
            let marker = L.marker([STATION.geojson.geometry.coordinates[1], STATION.geojson.geometry.coordinates[0]]).addTo(stations_layer_group)
            add_station_metadata(STATION, marker)
        }
        else if (STATION.geojson.geometry.type === "Polygon")
        {
            // "coordinates" are accessed at index "0" because geoJSOn wrappes the coordinates in an extra array
            let polygon = L.polygon(STATION.geojson.geometry.coordinates[0].map(function(coord) // used to change coords from lng/lat to lat/lng
            {
                return [coord[1], coord[0]]
            })).addTo(stations_layer_group)
            add_station_metadata(STATION, polygon)
        }
    }
}

// ----------------- Map Helperfunctions -----------------

/**
 * Zips together an array and a leaflet layergroup
 * @param {*} array - Arbitrary javascript array
 * @param {*} leaflet_layergroup - Leaflet LayerGroup
 * @returns Array containing the zipped data.
 */
function zip_array_and_leaflet_layergroup(array, leaflet_layergroup)
{
    let counter = 0
    leaflet_layergroup.eachLayer(function(layer)
    {
        array[counter].push(layer)
        counter += 1
    })

    return array
}

/**
 * This function sets the styling of the station to the default styling
 * @param {*} station - Leaflet Layer Object
 */
function default_styling(station)
{
    if (station instanceof L.Polygon)
    {
        station.setStyle({color: "#3388ff"}) // leaflets default color
    }
    else if (station instanceof L.Marker)
    {
        let old_icon = station.options.icon
        let highlight_icon = L.icon({
            // TODO: Discuss if this should be made independent of current leaflet version?
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            // reuse default styling
            shadowSize: old_icon.options.shadowSize,
            iconSize: old_icon.options.iconSize,
            iconAnchor: old_icon.options.iconAnchor,
            popupAnchor: old_icon.options.popupAnchor
        })
        station.setIcon(highlight_icon)
    }
}

/**
 * This function highlights the choosen station.
 * @param {} station - Leaflet Layer Object
 */
function highlight_station(station) 
{
    if (station instanceof L.Polygon)
    {
        station.setStyle({color: "#9C2BCB"})
    }
    else if (station instanceof L.Marker)
    {
        let old_icon = station.options.icon
        let highlight_icon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            // reuse default styling
            shadowSize: old_icon.options.shadowSize,
            iconSize: old_icon.options.iconSize,
            iconAnchor: old_icon.options.iconAnchor,
            popupAnchor: old_icon.options.popupAnchor
        })
        station.setIcon(highlight_icon)
    }
    
}


/**
 * This functions binds a Pop-Up to the leaflet object. The content for the Pop-Up is drawn from the station, which is stored in the DB.
 * @param {*} station - Station from the "station_collection"
 * @param {*} leaflet_object - Leaflet Object where the metadata should be added to
 */
function add_station_metadata(station, leaflet_object)
{
    let popupcontent = `<strong> Name: </strong> ${station.geojson.properties.name}  <br> <strong> Beschreibung: </strong> ${station.geojson.properties.description}  <br>`
    if (station.geojson.properties.url) // append only if exisitng, as its an optional parameter
    {
        popupcontent += `<strong> URL: </strong> <a href="${station.geojson.properties.url}" target="_blank"> ${station.geojson.properties.url} </a> `
    }
    leaflet_object.bindPopup(popupcontent)
}

// ----------------- Script Start -----------------

let map_init = initializeMap()
let map = map_init.map
let stations_layer_group = map_init.stations_layer_group
let drawnItems = map_init.drawnItems


// ----------------- Submit Field -----------------

// adds the file content uploaded to the input field to the textarea
document.getElementById('file_upload_geoJSON').addEventListener('change', function(event) 
{
    console.log(event.target)
    let file = event.target.files[0]
    // if no file is inputed
    if (!file) return
  
    let reader = new FileReader();
    reader.onload = function(event) 
    {
      let contents = event.target.result
      document.getElementById('textarea_geoJSON').value = contents
    }
    reader.readAsText(file)
  })

//set in own scope to prevent unwanted global variables
{
const SUBMIT_BUTTON = document.getElementById("submit_station")
SUBMIT_BUTTON.addEventListener("click", (event) => 
{
    event.preventDefault()
    let form = document.getElementById('station_upload_form')
    let formData = new FormData(form)
    
    // parse body from formData
    let request_body = 
    {
        type: JSON.parse(formData.get("textarea_geoJSON")).type,
        properties: {
            name: formData.get("input_name"),
            description: formData.get("input_description"),
            url: formData.get("input_url")
        },
        geometry: JSON.parse(formData.get("textarea_geoJSON")).geometry
    }
    console.log(request_body)
    add_new_station(request_body)
    form.reset()
    drawnItems.clearLayers() // resets all elements drawn with the draw-tool
})
}

// // set in own scope to prevent unwanted global variables
// // button functionality is set in "update_table()"
// {
// const UPLOAD_BUTTON = document.getElementById("upload_station")
// UPLOAD_BUTTON.setAttribute("class", "btn btn-primary")
// UPLOAD_BUTTON.setAttribute("data-toggle", "modal")
// UPLOAD_BUTTON.setAttribute("data-target", "#upload_station_popup")
// }

update_map()
update_table()


