"use strict"

/**
 * Calculates Centroid of Polygon
 * @param {*} polygon - Polygon-Coordinates from which the Centroid should be derieved
 * @returns {*} - Centroid of Polygon in LatLng-Format
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
    //first point of whole tour = first point of first segment of tour
    let segments = [[[route[0][1],route[0][0]]]];
    //tour_point_index represents the index of the points of the whole tour (not the first and the last)
    for (let tour_point_index = 1, segment_count = 1; tour_point_index < route.length -1; tour_point_index++) {
        //add the point with current index to the segment with current index (= count-1)
        segments[segment_count-1].push([route[tour_point_index][1],route[tour_point_index][0]]);
        //if a waypoint is reached create a new segment push the point with current index also in this segment
        if(JSON.stringify(route[tour_point_index]) === JSON.stringify(snapped_waypoints[segment_count])) {
            segments.push([]);
            segments[segment_count].push([route[tour_point_index][1],route[tour_point_index][0]]);
            segment_count++;
        }
    }
    //add the last point to the last segment
    let last = snapped_waypoints.length - 1;
    segments[last-1].push([snapped_waypoints[last][1],snapped_waypoints[last][0]]);
    return segments;
}

/**
 * This function builds an infotext for a tour containing:
 * 1. All stations get listed
 * 2. Instructions for following the tour
 * 3. Overall distance of the tour
 * 
 * @param {*} stations - stations of the tour
 * @param {*} instructions - instructions of the tour
 * @param {*} distance - distance of the tour
 * @returns {*} - Infotext as String
 */
export function build_info_text(stations, instructions, distance) {
    //list all stations of the tour
    let info_text = "<strong>Stationen:</strong>";
    stations.forEach( function({properties}) {
            info_text += "<br>" + properties.name;
    });
            
    //Give hints to instructions
    info_text += "<br><br><strong>Anleitung zur Tour:</strong>"
    info_text += "<br><div style='border:1px'>Diese Instruktionen kommen direkt von GRAPHHOPPER und sind somit leider nur auf englisch verfügbar.</div>"
    //Tell user instructions how to follow the tour
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
    //Overall distance of tour
    info_text+="<br><br><strong>Gesamtlänge</strong>: "
    info_text+= distance + "m";

    return info_text;
}