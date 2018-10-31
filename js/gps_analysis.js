// Author: Zachary Stanik
// Date: Summer 2018
// Employer: Dr. Trace Kershaw
// Organization: Yale School of Public Health
// Program: gps_analysis.js

/* Purpose: retrieves file belonging to a participant ID from a server configured to store data from research participants.
Pulls GPS coordinates from this file along with their timestamps, creates array of pairs of GPS coordinates, sorted in chronological order.
For each pair of coordinates in the array, performs a reverse geocode search using the Google Maps Reverse Geocoding Service. The results, returned as
an array containing the main address as the first element, are stored in a JavaScript object, with the properties being the names (or addresses) of the places
and values being objects containing frequency of visits, GPS coordinates, importance index, and distance from home (miles).
6 values are kept track of during the for loop execution: maxFrequency (int), minFrequency (int), prevPlacesSearch (array), and count (int).
These are used for calculating frequency of visits, and importance indices.

Frequency of visits is incremented by one every time the reverse geocoding search returns an address already present in the address object.
If this value is greater than maxFrequency, the value of maxFrequency is updated.

GPS coordinates are then provided by performing a regular geocoding search with the address.

The importance index is a number on a scale from 0-100 that is calculated as following: the minFrequency is used as the lower delimiting value, and the
maxFrequency is used as the upper delimiting value and other address frequency values are then normalized.
This index is used to determine the participant's top 10 locations and the color gradient of the marker
on the Google Map.

The participant's home is most likely (see note below) the place with the highest importance index. Thus, every address has its distance from
home calculated after the for loop is done executing.

After all the above are calculated, another for loop will run through the results object, create a Google Map, and place a marker for every address
in the object, with information windows containing the information in the value fields of the object.

Question: need to find best method of determining participant's home. Could either assume it's the place they spend the longest average time or
could ask for the home address along with the participant ID. Perhaps talk to Erin regarding this.*/

// Global variables
var gpsCoords = ["1157463822,41.385087,-81.442711", "1147342172,41.390464,-81.443891", "1147361243,41.371734,-81.420534", "1147381432,41.371793,-81.420280", "1148358473,41.377944,-81.429590", "1148267548,41.384962,-81.440415", "1164382745,41.371863,-81.419456", "1162384753,41.371980,-81.418795", "1165372989,41.371863,-81.419084"];
var addresses = [];
var map;
var geocoder;
var count = 0;
var maxFrequency = 1, minFrequency = 1;

function getData () {
	var partID = document.getElementById("IDText").value;
	/* Some code to check if participant ID is in right form */
	/* Extract GPS coordinates from participant_partID_gps_data.json */
	
	initMap();
	populateAddresses(function () {
		console.log(addresses);
		findMinFrequency();
		importanceIndex();
		distFromHome();
		addMarkers();
	});
}

// Custom comparison function for GPS entries
function compareCoords(a, b) {
	var index = a.indexOf(",");
	var str1 = a.slice(0, index);
	index = b.indexOf(",");
	var str2 = b.slice(0, index);
	return parseInt(str1) - parseInt(str2);
}

// Custom comparison function for addresses based on importance indices
function compareAddresses(a, b) {
	return b.impIdx - a.impIdx;
}

// Address object constructor
function Address(name, lat, lng) {
	this.address = name;
	this.visitFreq = 1;
	this.lat = lat;
	this.lng = lng;
	this.impIdx = 0;
	this.distHome = 0;
}

// Initializes the Google Map to which the markers will be added
function initMap() {
	geocoder = new google.maps.Geocoder();
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: -34.397, lng: 150.644},
			zoom: 1
	});
}

var result;
var tmp;
var j = 0;
var len;

// Uses Google Maps JavaScript API Geocoding service to reverse geocode each set of GPS coordinates to the nearest
// address then geocode this address to get the precise coordinates for the Address object
function populateAddresses(done) {
	gpsCoords.sort(compareCoords);
	len = gpsCoords.length;
	for(var i = 0; i < len; i++) {
		var latlngStrs = gpsCoords[i].split(',', 3);
		var latlng = {lat: parseFloat(latlngStrs[1]), lng: parseFloat(latlngStrs[2])};
		console.log(latlng.lat, latlng.lng);
		geocoder.geocode({'location': latlng}, function(results, status) {
			if (status === 'OK') {
				if (results[0]) {
					result = results[0].formatted_address;
					console.log(result);
					if (tmp = addresses.find(function(adr) { return adr.address == result; })) {
						console.log("found equal");
						tmp.visitFreq++;
						if(tmp.visitFreq > maxFrequency) {
							maxFrequency = tmp.visitFreq;
						}
						// This conditional forces all the queued callback functions to complete before continuing the program, ensuring addresses is properly initialized
						if(j == (len - 1)) {
								done();
							}
						j++;
					}
					else {
						geocoder.geocode( {'address': result}, function(results, status) {
							if (status === 'OK') {
								addresses.push(new Address(results[0].formatted_address, results[0].geometry.location.lat(), results[0].geometry.location.lng()));
								console.log("successful push");
								console.log(j);
								console.log(len);
								console.log(addresses[0].lat);
								count++;
							}
							else {
								alert("Geocode was not successful: " + status);
							}
							if(j == (len - 1)) {
								done();
							}
							j++;
						});
					}
				}
				else {
					alert("No address at location");
					if(j == (len - 1)) {
						done();
					}
					j++;
				}
			}
			else {
				alert("Reverse geocode was not successful: " + status);
				if(j == (len - 1)) {
					console.log(j);
					console.log(len);
					done();
				}
				j++;
			}
		});
	}
}

function findMinFrequency() {
	for (var i = 0; i < count; i++) {
		if(addresses[i].visitFreq < minFrequency) {
			minFrequency = addresses[i].visitFreq;
		}
	}
}

function importanceIndex() {
	var range = maxFrequency - minFrequency;
	var multiplier = 100/range;
	
	for (var i = 0; i < addresses.length; i++) {
		addresses[i].impIdx = (addresses[i].visitFreq*multiplier) - minFrequency;
	}
}

// Calculates distance from home in kilometers
function distFromHome() {
	addresses.sort(compareAddresses);
	console.log(addresses.length);
	for (var i = 0; i < addresses.length; i++) {
		addresses[i].distHome = distance(addresses[i].lat, addresses[i].lng, addresses[0].lat, addresses[0].lng, "K");
		console.log(addresses[i].distHome);
	}
}

var infowindows = [];

// For every Address object in addresses, adds a marker and infowindow to the map initialized earlier
function addMarkers() {
	console.log(addresses[0].lat);
	map.setCenter({'lat': addresses[0].lat, 'lng': addresses[0].lng});
	map.setZoom(11);
	var markers = [];
	
	for (var i = 0; i < addresses.length; i++) {
		console.log(addresses[i].lat);
		markers.push(new google.maps.Marker({
			position: {'lat': addresses[i].lat, 'lng': addresses[i].lng},
			map: map,
			title: addresses[i].name
		}));
		infowindows.push(new google.maps.InfoWindow({
			content: addresses[i].address + ", " + addresses[i].lat + ", " + addresses[i].lng
		}));
	}
	for (var i = 0; i < markers.length; i++) {
		console.log(infowindows[i].content);
		var infowindow = infowindows[i];
		var marker = markers[i];
		infowindow.open(map, marker);
	}
}

// This function is licensed under LGPLv3 by GeoDataSource.com
// Provided at https://www.geodatasource.com/developers/javascript
// Calculates the distance between 2 sets of GPS coordinates
function distance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1/180;
	var radlat2 = Math.PI * lat2/180;
	var theta = lon1-lon2;
	var radtheta = Math.PI * theta/180;
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	if (dist > 1) {
		dist = 1;
	}
	dist = Math.acos(dist);
	dist = dist * 180/Math.PI;
	dist = dist * 60 * 1.1515;
	if (unit=="K") { dist = dist * 1.609344; }
	if (unit=="N") { dist = dist * 0.8684; }
	return dist;
}