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
        edit_station_button.innerText = "Station bearbeiten"
        edit_station_button.setAttribute("type", "button")
        edit_station_button.addEventListener("click", () => {
            const modal = document.getElementById("modal")
            modal.showModal()
        })
        

        row.insertCell().appendChild(edit_station_button)

    }
    
    table.tBodies[0].replaceWith(tbody);
}

update_table()