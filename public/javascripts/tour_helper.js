"use strict"

/**
 * Calculates Centroid of Polygon
 * @param {*} polygon - Polygon-Coordinates from which the Centroid should be derived
 * @returns {*} - Object with Centroid of Polygon in LatLng-Format
 */
export function calculate_centroid(polygon) {
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
export function slice_tour(route, snapped_waypoints) { 
    
    // first point of whole tour = first point of first segment of tour
    let segments = [[[route[0][1],route[0][0]]]];
    
    // tour_point_index represents the index of the points of the whole tour (not the first and the last)
    for (let tour_point_index = 1, segment_count = 1; tour_point_index < route.length -1; tour_point_index++) {
        
        // add the point with current index to the segment with current index (= count-1)
        segments[segment_count-1].push([route[tour_point_index][1],route[tour_point_index][0]]);
        
        // if a waypoint is reached create a new segment push the point with current index also in this segment
        if(JSON.stringify(route[tour_point_index]) === JSON.stringify(snapped_waypoints[segment_count])) {
            segments.push([]);
            segments[segment_count].push([route[tour_point_index][1],route[tour_point_index][0]]);
            segment_count++;
        }
    }
    
    // add the last point to the last segment
    let last = snapped_waypoints.length - 1;
    segments[last-1].push([snapped_waypoints[last][1],snapped_waypoints[last][0]]);
    return segments;
}

/**
 * This function builds an infotext for a tour containing:
 * 1. All stations in a list
 * 2. Instructions how to follow the tour
 * 3. Overall distance of the tour
 * 
 * @param {*} stations - stations of the tour
 * @param {*} instructions - instructions of the tour
 * @param {*} distance - distance of the tour
 * @returns {*} - Infotext as String
 */
export function show_info_text(stations, instructions, distance) {
    
    // list all stations of the tour
    let station_text = "<ul class='mb-0'>";
    stations.forEach( function({properties}) {
            station_text += "<li>" + properties.name + "</li>";
    })
    station_text += "</ul>"
    document.getElementById("station_text").innerHTML = station_text;
    
    // give user instructions how to follow the tour
    let instruction_text = "<ol>";
    for (const INSTRUCTION of instructions) {
        if(INSTRUCTION.text.startsWith("Waypoint")) {
            instruction_text += "<li><strong>You arrived at one station</strong></li>";
        }
        else if (INSTRUCTION.text.startsWith("Arrive at destination")){
            instruction_text += "<li><strong>Arrive at destination</strong></li>";
        }
        else {
            instruction_text += "<li>" + INSTRUCTION.text + " and follow the path for " + Math.round(INSTRUCTION.distance) + " meter</li>";
        }
    }
    instruction_text += "</ol>";
    document.getElementById("instruction_text").innerHTML = instruction_text;
    
    // Overall distance of tour
    let distance_text="<strong>Gesamtlänge</strong>: "
    distance_text+= distance + "m";
    document.getElementById("distance_text").innerHTML = distance_text;
}

/**
 * This function specify the text of the error-Popup for the User depending on the technical error-Message
 * @param {*} message - error-Message of a route
 */
export function show_routing_error_text(message)
{
    $('#routing_error_popup').modal('show');
    let error_statement = "Leider konnte mit den ausgewählten Stationen keine Tour erstellt werden. <br>";
    if (message.startsWith("Specify at least 2 points")) {
        error_statement += "<strong>Dies liegt unter anderem daran, dass weniger als 2 Stationen ausgewählt wurden.</strong> <br>";
    }
    else if (message.endsWith("Upgrade your subscription or contact us.")) {
        error_statement += "<strong>Dies liegt unter anderem daran, dass zu viele Stationen ausgewählt wurden.</strong> <br>";
    }
    else if (message.startsWith("Connection between locations not found")) {
        error_statement += "<strong>Dies liegt unter anderem daran, dass zwischen den ausgewählten Stationen keine Fahrradweg-Verbindung existiert.</strong> <br>";
    }
    else if (message.startsWith("Cannot find point")) {
        error_statement += "<strong>Dies liegt unter anderem daran, dass eine ausgewählte Station zu weit von einem Fahrradweg entfernt ist.</strong> <br>";
    }
    else if (message.startsWith("API limit reached")) {
        error_statement += "<strong>Dies liegt unter anderem daran, dass zur Zeit zu viele Anfragen gestellt wurden.</strong> <br>";
    }
    else if (message.startsWith("Wrong credentials")) {
        error_statement += "<strong>Dies liegt unter anderem daran, dass ein ungültiger Graphhopper-API-Key benutzt wurde.</strong> <br>";
    }
    else if (message.startsWith("Tourname")) {
        error_statement += "<strong>Dies liegt unter anderem daran, dass kein gültiger Tourname angegeben wurde.</strong> <br>";
    }
    else if (message.startsWith("DB-Error")) {
        error_statement += "Während des Speichervorgangs ist etwas schief gelaufen. <br>";
        if (message.endsWith("413")) {
            error_statement += "<br><strong>Dies liegt unter anderem daran, dass zu viele Stationen zu weit voneinander entfernt sind, sodass die Tour insgesamt zu lang wäre.</strong> <br>"
        }
    }
    else {
        error_statement += "Dies könnte beispielsweise daran liegen, dass gar keine Stationen ausgewählt wurden. <br>";
        error_statement += "Aber auch andere Fehler können auftreten und wir bitten um Entschuldigung, dass es nicht geklappt hat. <br>";
    }
    error_statement += "<br><br>Bitte überprüfe die aktuelle Stationenauswahl und versuche es erneut."
    document.getElementById("error_statement").innerHTML = error_statement;
}

/**
 * This function highlightes a tour using its id. If id is null the last tour gets highlighted
 * @param {*} id - id of updated tour (if its a new tour its null)
 */
export function highlight_worked_on_tour(id) {
    let table = document.getElementById('tour_table');
    let tbody = table.tBodies[0];
    if (id == null) {
    
        // if a new tour created we can simply highlight the last tour because it gets appended in the tour_table
        tbody.rows[table.tBodies[0].rows.length - 1].click();
    }
    else { 
    
        // else we search the right row via id comparision
        for(const ROW of tbody.rows) {
            if (ROW.getAttribute("_id") == id) {
                ROW.click();
            }
        };
    }
}