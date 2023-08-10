"use strict"
import {zip_array_and_leaflet_layergroup, highlight, default_style, add_station_metadata} from "./map_helper.js"


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

export async function update_table() {
    station_collection = await fetch("/api/stations")
    station_collection = await station_collection.json()

    // Fill table with route entries
    let table = document.getElementById("station_table")
    let tbody = document.createElement('tbody')

    let stations_data = zip_array_and_leaflet_layergroup(Object.values(station_collection), stations_layer_group)
    
    for (const [STATION, LEAFLET_LAYER] of stations_data) 
    {
        // give Layer a property for later highlighting
        //LEAFLET_LAYER["highlighted"] = false

        let row = tbody.insertRow()
        row.addEventListener("click", function(event) 
        {
            if (event.target.tagName !== "BUTTON") // only activates click event, if no button of the row is pressed
            {
                if (LEAFLET_LAYER.highlighted)
                {
                    default_style(LEAFLET_LAYER)
                }
                else
                {
                    // reset styling of each layer
                    stations_layer_group.eachLayer(function(LEAFLET_LAYER)
                    {
                        default_style(LEAFLET_LAYER)
                    })

                    highlight(LEAFLET_LAYER)

                    // set map zoom on the highlighted feature
                    if (LEAFLET_LAYER instanceof L.Polygon)
                    {
                        map.setView(LEAFLET_LAYER.getCenter(), 30)
                    }
                    else if (LEAFLET_LAYER instanceof L.Marker)
                    {
                        map.setView(LEAFLET_LAYER.getLatLng(), 30)
                    }
                }
            } 
        })
        let station_name = document.createElement("td")
        station_name.innerText = STATION.properties.name
        station_name.id = `station_name${STATION._id}` // TODO: evtl löschen, da nicht genutzt
        row.insertCell().appendChild(station_name)

        let edit_station_button = document.createElement("button")
        edit_station_button.innerText = "Bearbeiten"
        edit_station_button.setAttribute("type", "button")
        edit_station_button.setAttribute("class", "btn btn-primary")
        edit_station_button.setAttribute("data-toggle", "modal")
        edit_station_button.setAttribute("data-target", "#edit_station_popup")
        
        edit_station_button.addEventListener("click", function()
        {
            // populate popUp with station data
            let station_update_textarea = document.getElementById("update_stationGeoJSON")
            // station-id set for later "onclick" event to update the edited station
            station_update_textarea.setAttribute("data-station_id", `${STATION._id}`)
            station_update_textarea.value = JSON.stringify(
                {
                    type: STATION.type,
                    geometry: STATION.geometry,
                    properties: STATION.properties
                }, null, 2)
        })
        row.insertCell().appendChild(edit_station_button)

        let delete_station_button = document.createElement("button")
        delete_station_button.innerText = "Löschen"
        delete_station_button.setAttribute("type", "button")
        delete_station_button.setAttribute("class", "btn btn-primary")
        delete_station_button.addEventListener("click", function() 
        {
            delete_station(STATION._id)
        })
        row.insertCell().appendChild(delete_station_button)
    }
    table.tBodies[0].replaceWith(tbody)
}

// ----------------- Map -----------------

function initializeMap()
{
    // create map-object with initial view set to Münster, Germany
    let map = new L.map('map1').setView([51.96918, 7.59579], 13)

    // initialize base map
    let osmLayer = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {attribution:'&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'})

    osmLayer.addTo(map)

    // FeatureGroup is to store editable layers
    let drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    // initialise draw control
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

    // LayerGroup to later store stations
    let stations_layer_group = L.layerGroup()
    map.addLayer(stations_layer_group)

    // save drawn items 
    map.on(L.Draw.Event.CREATED, function (event) 
    {
        // clears all Elements that were drawn before
        drawnItems.clearLayers() 

        // the drawn layer
        let layer = event.layer

        // adds drawn layer to the editable layers
        drawnItems.addLayer(layer)

        // adds the geojson of the layer to the textarea, so that users can edit the metadata
        let textarea = document.getElementById("hidden_geojson_data_from_map_feature")
        textarea.value = JSON.stringify(layer.toGeoJSON(), null, 2)
    })

    map.on(L.Draw.Event.EDITED, function (event) 
    {
        let textarea = document.getElementById("textarea_geoJSON")

        // the edited layer
        console.log(event)
        let layer = Object.values(event.layers._layers)[0]

        // updates data in the textarea
        textarea.value = JSON.stringify(layer.toGeoJSON(), null, 2)
    })

    map.on(L.Draw.Event.DELETED, function (event) 
    {
        // reset content of textarea
        let textarea = document.getElementById("textarea_geoJSON")
        textarea.value = ""
    })


    return {
        map: map,
        stations_layer_group: stations_layer_group,
        drawnItems: drawnItems,
        drawControl: drawControl
    }
}

/**
 * Updates the stations displayed on the map (markers and Pop-Ups)
 */
async function update_map()
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
        if (STATION.geometry.type === "Point")
        {
            let marker = L.marker([STATION.geometry.coordinates[1], STATION.geometry.coordinates[0]]).addTo(stations_layer_group)
            add_station_metadata(STATION, marker)
        }
        else if (STATION.geometry.type === "Polygon")
        {
            // "coordinates" are accessed at index "0" because geoJSOn wrappes the coordinates in an extra array
            let polygon = L.polygon(STATION.geometry.coordinates[0].map(function(coord) // used to change coords from lng/lat to lat/lng
            {
                return [coord[1], coord[0]]
            })).addTo(stations_layer_group)
            add_station_metadata(STATION, polygon)
        }
    }
}

// ----------------- Station Form -----------------

function enter_add_station_mode(edit_style)
{
    switch(edit_style)
    {
        case "map":
            // hide buttons
            document.getElementById("add_station_button_area").style.display = "none"
            // show map form
            document.getElementById("map_form").style.display = "block"
            break
        case "textarea":
            // hide buttons
            document.getElementById("add_station_button_area").style.display = "none"
            // show geojson_texarea form
            document.getElementById("geojson_textarea_form").style.display = "block"
            break
        case "file-upload":
            // hide buttons
            document.getElementById("add_station_button_area").style.display = "none"
            // show geojson_texarea form
            document.getElementById("geojson_upload_form").style.display = "block"
            break

    }

}

/**
 * Hides the currently shown form and returns to the button view "#add_station_button_area"
 * @param {} form - Form that should be hidden
 */
function leave_add_station_mode(form)
{
    // hide form element
    form.style.display = "none"
    // show buttons
    document.getElementById("add_station_button_area").style.display = "block"
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the buttons to choose in which style the user wants to add a new station and to leave the form.
 * */ 
function prepare_form_buttons()
{
    
    // open_map_form button
    document.getElementById("open_map_form").addEventListener("click", function()
    {
        // add stations via map
        enter_add_station_mode("map")

        // activate draw control on map
        map.addControl(drawControl)
    })

    // submit_map_form button
    document.getElementById("submit_map_form").addEventListener("click", function(event)
    {
        event.preventDefault()
        let form = document.getElementById('map_form')
        let formData = new FormData(form)
        console.log(formData)
        
        // parse body from formData
        let request_body = 
        {
            type: JSON.parse(formData.get("hidden_geojson_data_from_map_feature")).type,
            properties: {
                name: formData.get("input_name"),
                description: formData.get("input_description"),
                url: formData.get("input_url")
            },
            geometry: JSON.parse(formData.get("hidden_geojson_data_from_map_feature")).geometry
        }
        add_new_station(request_body)

        form.reset()

        // resets all elements drawn with the draw-tool
        drawnItems.clearLayers() 
        leave_add_station_mode(this.parentElement)
    })


    // cancel_map_form button
    document.getElementById("cancel_map_form").addEventListener("click", function()
    {
        // hide coressponding form element
        leave_add_station_mode(this.parentElement)

        // deactivate draw control on map
        map.removeControl(drawControl)
    })

    // open_geojson_textarea_form button
    document.getElementById("open_geojson_textarea_form").addEventListener("click", function()
    {
        // add stations via textarea
        enter_add_station_mode("textarea")
    })

    //TODO: Funktionalität zum "Daten absenden ergänzen"

    // cancel_geojson_textarea_form button
    document.getElementById("cancel_geojson_textarea_form").addEventListener("click", function()
    {
        // hide coressponding form element
        let coressponding_form = this.parentElement
        leave_add_station_mode(coressponding_form)
        // reset form
        coressponding_form.reset()
    })

    // show_sample_geojson button
    document.getElementById("show_sample_geojson").addEventListener("click", function()
    {
        let textarea = document.getElementById("textarea_geoJSON")
        textarea.value = JSON.stringify(
        {
            "type": "Feature",
            "properties": {
                "name": "Prinzipalmarkt",
                "description": "Das ist der Prinzipalmarkt",
                "url": "https://de.wikipedia.org/wiki/Prinzipalmarkt"
            },
            "geometry": {
              "coordinates": [
                7.628199238097352,
                51.962239849033296
              ],
              "type": "Point"
            }
        }, null, 2)
    })

    // open_geojson_upload_form button
    document.getElementById("open_geojson_upload_form").addEventListener("click", function()
    {
        // add stations via textarea
        enter_add_station_mode("file-upload")
    })
        //TODO: Funktionalität zum "Daten absenden ergänzen"


    // cancel_geojson_upload_form button
    document.getElementById("cancel_geojson_upload_form").addEventListener("click", function()
    {
        // hide coressponding form element
        leave_add_station_mode(this.parentElement)
    })
 
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the geojson_file_upload input element
 * */ 
function prepare_geojson_file_ulpoad()
{
    // adds the file content uploaded to the input field to the textarea
    document.getElementById('file_upload_geoJSON').addEventListener('change', function(event) 
    {
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
}

// ggf. löschen
// //set in own scope to prevent unwanted global variables
// {
// const SUBMIT_STATION_FORM_BUTTON = document.getElementById("submit_station")
// SUBMIT_STATION_FORM_BUTTON.addEventListener("click", function(event)
// {
//     //event.preventDefault()
//     let form = document.getElementById('station_upload_form')
//     let formData = new FormData(form)
    
    
//     // parse body from formData
//     let request_body = 
//     {
//         type: JSON.parse(formData.get("textarea_geoJSON")).type,
//         properties: {
//             name: formData.get("input_name"),
//             description: formData.get("input_description"),
//             url: formData.get("input_url")
//         },
//         geometry: JSON.parse(formData.get("textarea_geoJSON")).geometry
//     }
//     add_new_station(request_body)
//     form.reset()
//     drawnItems.clearLayers() // resets all elements drawn with the draw-tool
// })
// }

// ----------------- Script Start -----------------

let map_init = initializeMap()
let map = map_init.map
let stations_layer_group = map_init.stations_layer_group
let drawnItems = map_init.drawnItems
let drawControl = map_init.drawControl

/* Use "event delegation" to bind an event to a detached button. The button "#update_station" is first attached to the DOM, if the modal "'edit_station_popup"
 is opened (the button is part of the modal), therefore pre-existing events for this button might get lost.*/
document.body.addEventListener('click', function(event) {
    // set/overwrite event on button "#update_station"
    if (event.target.id === 'update_station') {
        const UPDATE_STATION_TEXTAREA = document.getElementById(`update_stationGeoJSON`)
        const UPDATED_STATION = JSON.parse(UPDATE_STATION_TEXTAREA.value)
        const STATION_ID = UPDATE_STATION_TEXTAREA.dataset.station_id
        update_station(STATION_ID, UPDATED_STATION)  
    }
})

prepare_form_buttons()
prepare_geojson_file_ulpoad()

update_map()
update_table()


