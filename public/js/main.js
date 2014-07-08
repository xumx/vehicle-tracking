var map, ships, selectedShip, zones = [],
	player = {},
	invalidmmsi = [];
	filter = false,
	alertDomainViolation = false,
	debug = false,
	infowindow = new google.maps.InfoWindow({}),
	infoBubble = new InfoBubble({
		shadowStyle: 1,
		padding: 4,
		backgroundColor: 'rgb(57,57,57)',
		borderRadius: 4,
		arrowSize: 10,
		borderWidth: 1,
		borderColor: '#2c2c2c',
		disableAutoPan: false,
		hideCloseButton: false,
		arrowPosition: 30,
		backgroundClassName: 'phoney',
		arrowStyle: 2
	});

now.start = function(data) {
	ships = data;
	$(document).ready(function() {
		init();
		now.getStatistics();
	});
};

now.sync = function(data) {
	//Remove Old Ships
};

now.domainViolation = function(mmsi1, ship1, mmsi2, ship2) {

	if (!ships[mmsi1].domain) {

		ships[mmsi1].domain = new google.maps.Circle({
			center: ships[mmsi1].marker.getPosition(),
			radius: ship1.length,
			strokeColor: '#F01010',
			fillOpacity: 0.2,
			strokeWeight: 2,
			strokeOpacity: 0.5

		});
	}

	if (!ships[mmsi2].domain) {
		ships[mmsi2].domain = new google.maps.Circle({
			center: ships[mmsi2].marker.getPosition(),
			radius: ship2.length,
			strokeColor: '#F01010',
			fillOpacity: 0.2,
			strokeWeight: 2,
			strokeOpacity: 0.5

		});
	}

	if (alertDomainViolation) {
		ships[mmsi1].domain.setMap(map);
		ships[mmsi2].domain.setMap(map);
		map.setCenter(ships[mmsi1].marker.getPosition());
		map.setZoom(17);
		setTimeout(function(){map.setZoom(15)},1000);
	}

	// console.log("ship " + mmsi1 + " and ship " + mmsi2 + " is violating ship Domain Policy");
};

now.printStatistics = function(stats) {
	$('#numberOfShips').text(stats.numberOfShips.toString());
	$('#numberOfAnchoredShips').text(stats.numberOfAnchoredShips.toString());
	$('#maxDistanceFromSensor').text(stats.maxDistanceFromSensor.toString());
	//events = stats.events;
};

now.updateShip = function(ais) {
	var position = new google.maps.LatLng(ais.data.lat, ais.data.lon),
		ship = ships[ais.mmsi];

	if (ship === undefined) {

		ship = {
			lat: ais.data.lat,
			lon: ais.data.lon,
			speed: ais.data.speed,
			course: ais.data.course,

			history: [position],
			marker: new google.maps.Marker({
				position: position,
				icon: '/img/marker.png',
				map: filter ? null : map
				// icon:(ais.speed > 0.1) ? '/img/marker.png' : '/img/anchor.png',
			}),

			line: new google.maps.Polyline({
				strokeColor: '#F00',
				strokeWeight: 1,
				map: map
			})
		};

		ships[ais.mmsi] = ship;
		addShipToTable(ais.mmsi, ship);
		if (debug) console.log(ais.mmsi + " Added");

		now.getStatistics();
	} else {
		ship.history.push(position);
		ship.line.setPath(ship.history);
		ship.marker.setPosition(position);
		if (ship.domain !== undefined) ship.domain.setCenter(position);
		if (debug) console.log(ais.mmsi + " Updated");
	}
};

function init() {
	var mapCenter = new google.maps.LatLng(1.272, 103.815);

	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 13,
		center: mapCenter,
		mapTypeControl: true,
		zoomControl: false,
		panControl: false,
		keyboardShortcuts: false,
		streetViewControl: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		styles: [{
			featureType: "all",
			stylers: [{
				saturation: -80
			}]
		}]
	});

	zones[0] = new google.maps.Polygon({
		paths: [new google.maps.LatLng(1.2595, 103.8111), new google.maps.LatLng(1.2565, 103.8237), new google.maps.LatLng(1.267, 103.8237), new google.maps.LatLng(1.26585, 103.80726)],
		strokeWeight: 1,
		strokeOpacity: 0.5,
		strokeColor: '#FF0000',
		fillColor: '#FF0000',
		fillOpacity: 0.25,
		map: map
	});

	$.get('./event/invalidmmsi/', function(data) {
		//Array of Invalid MMSI
		invalidmmsi = JSON.parse(data);
		console.log("Invalid MMSI Updated")
	});

	//Long Polling
	setInterval(function () {
			$.get('./event/invalidmmsi/', function(data) {
				//Array of Invalid MMSI
				invalidmmsi = JSON.parse(data);
				console.log("Invalid MMSI Updated")
			});
		}, (60 * 1000));


	for (var mmsi in ships) {
		if (!ships.hasOwnProperty(mmsi)) {
			continue;
		}

		var ship = ships[mmsi];
		var position = new google.maps.LatLng(ship.lat, ship.lon);
		ship.history = [position];
		ship.marker = new google.maps.Marker({
			position: position,
			icon: '/img/marker.png',
			//icon:(ship.speed > 0.1) ? '/img/marker.png' : '/img/anchor.png',
			map: map
		});

		ship.line = new google.maps.Polyline({
			strokeColor: '#F00',
			strokeWeight: 1,
			map: map
		});

		addShipToTable(mmsi, ship);
	}

	$('#subscribeButton').click(function() {
		var email = $('#email').val();
		var mmsi = $('#selectedMMSI').val();
		var ship = ships[mmsi];

		var subscribeListener = google.maps.event.addListener(ship.marker, 'position_changed', subscribeToShip(mmsi, ship));
		//google.maps.event.removeListener(subscribeListener)
	});

	$('#editZone').click(function() {
		for (var i = 0; i < zones.length; i++) {
			zones[i].setEditable((zones[i].getEditable() ? false : true));
		}

		$('#editZone').text((zones[0].getEditable() ? 'End Edit' : 'Edit Zone'));
	});

	$('#addZone').click(function() {

		var zone = new google.maps.Polygon({
			paths: [
			new google.maps.LatLng(1.1, 103.7), new google.maps.LatLng(1.2, 103.8), new google.maps.LatLng(1.1, 103.9)],
			strokeColor: '#FF0000',
			strokeOpacity: 0.5,
			strokeWeight: 1,
			fillColor: '#FF0000',
			fillOpacity: 0.20,
			editable: zones[0].getEditable()
		});

		zone.setMap(map);
		zones.push(zone);
	});

	// $('#invalidmmsi').click(function() {
	// 	for (mmsi in ships) {
	// 		console.log(invalidmmsi.indexOf(ships[mmsi]));
	// 		if ($.inArray(mmsi, invalidmmsi) > -1) {
	// 			ships[mmsi].marker.setIcon('/img/alert.png');
	// 		}
	// 	}
	// });

	$('#invalidmmsi').click((function() {
		var flag = false;
		return function() {
			for (mmsi in ships) {
				if (flag) {
					ships[mmsi].marker.setIcon('/img/marker.png');
				} else {
					if ($.inArray(mmsi, invalidmmsi) > -1) {
						ships[mmsi].marker.setIcon('/img/alert.png');
					}
				}
			}
			flag = flag ? false : true;
		};
	})());

	$('#refresh').click(function() {
		location.reload();
	});

	$('#domain').click(function() {
		var mmsi;
		if (alertDomainViolation) {
			for (mmsi in ships) {
				if (ships[mmsi].domain) ships[mmsi].domain.setMap(null);
			}

			alertDomainViolation = false;
			$('#domain').text('Domain Violation');

		} else {
			for (mmsi in ships) {
				if (ships[mmsi].domain) ships[mmsi].domain.setMap(map);
			}

			alertDomainViolation = true;
			$('#domain').text('Off Domain Violation');
		}
	});

	$('#filter').click(function() {
		var i, mmsi, top10FastShips = ["123456789", "123456789", "123456789", "123456789", "123456789", "123456789", "123456789", "123456789", "123456789", "123456789"];

		if (filter) {
			filter = false;

			for (mmsi in ships) {
				if (!ships.hasOwnProperty(mmsi)) {
					continue;
				}

				var ship = ships[mmsi];
				ship.marker.setMap(map);
				ship.line.setMap(map);
			}

		} else {
			filter = true;

			for (mmsi in ships) {

				//Find Slowest Ship
				var lowestSpeed = 100;
				var slowestIndex = 0;

				for (i = 0; i < top10FastShips.length; i++) {
					if (ships[top10FastShips[i]] === undefined || ships[top10FastShips[i]].speed < lowestSpeed) {
						if (ships[top10FastShips[i]] === undefined) lowestSpeed = 0;
						else lowestSpeed = ships[top10FastShips[i]].speed;
						slowestIndex = i;
					}
				}

				//If current Ship is faster than the Slowest Ship in list, replace MMSI.
				if (ships[mmsi].speed > lowestSpeed) {
					top10FastShips[slowestIndex] = mmsi;
				}
			}

			for (mmsi in ships) {
				if (!ships.hasOwnProperty(mmsi)) {
					continue;
				}


				if (in_array(top10FastShips, mmsi)) {
					continue;
				}

				//Hide Markers and Lines
				ships[mmsi].marker.setMap(null);
				ships[mmsi].line.setMap(null);
			}

			for (i = 0; i < top10FastShips.length; i++) {
				console.log(ships[top10FastShips[i]].speed);
			}
		}

		$('#filter').text((filter ? 'Off APL Filter' : 'APL Filter'));
	});



	$('#debug').click(function() {
		if (player.marker === undefined) {
			player.marker = new google.maps.Marker({
				position: new google.maps.LatLng(1.2565, 103.8237),
				icon: '/img/player.png',
				draggable: true,
				map: map
			});

			google.maps.event.addListener(player.marker, 'click', function() {
				var contentString = '<div style="color:white">You can now control this ship using Arrow Keys</div>';
				infoBubble.close();
				infoBubble.setContent(contentString);
				infoBubble.open(map, player.marker);
			});

			$(document).keydown(function(e) {
				if (e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 37) {
					var p = player.marker.getPosition();

					switch (e.keyCode) {
					case 38:
						player.marker.setPosition(new google.maps.LatLng(p.lat() + 0.0001, p.lng()));
						break;
					case 40:
						player.marker.setPosition(new google.maps.LatLng(p.lat() - 0.0001, p.lng()));
						break;
					case 37:
						player.marker.setPosition(new google.maps.LatLng(p.lat(), p.lng() - 0.0001));
						break;
					case 39:
						player.marker.setPosition(new google.maps.LatLng(p.lat(), p.lng() + 0.0001));
						break;
					}
				}
			});
		}
	});

	function subscribeToShip(mmsi, s) {
		var emailSent = false;

		var ship = {
			"mmsi": s.mmsi,
			"lat": s.marker.getPosition().lat(),
			"lon": s.marker.getPosition().lng(),
			"length": s.length
		};

		var callback = function() {
				if (zonesContainsShip(s) && emailSent === false) {
					s.marker.setIcon('/img/alert.png');
					s.marker.setAnimation(google.maps.Animation.BOUNCE);

					emailSent = true;
					console.log("Sending Zone Violation Event Information");
					now.events(mmsi, ship);
					//s.marker.removeEventListener('position_changed',subscribeToShip);
				}
			};

		return callback;
	}

	function zonesContainsShip(ship) {
		var coordinate = ship.marker.position;

		for (var i = 0; i < zones.length; i++) {
			if (zones[i].containsLatLng(coordinate)) {
				return true;
			}
		}

		return false;
	}
}

function addShipToTable(mmsi, ship) {

	var row = $('<tr><td>' + mmsi + '</td></tr>');

	row.click(function() {
		var mmsi = $(this).children().text();
		$('#selectedMMSI').val(mmsi);

		$(this).css('background', '#aff6ac');
		$(this).siblings().css('background', '#FFFFFF');

		ship = ships[mmsi];
		var contentString = '<div style="color:white">MMSI: ' + mmsi + '</br>' + 'Speed: ' + ship.speed + ' Knots</br>' + 'Latitude: ' + ship.lat + '</br>' + 'Longitude: ' + ship.lon + '</br>' + '<b><a href="http://www.marinetraffic.com/ais/shipdetails.aspx?mmsi=' + mmsi + '" target="_blank">More Info</a></b></div>';
		// infowindow.close();
		// infowindow.setContent(contentString);
		// infowindow.open(map,ships[mmsi].marker);
		infoBubble.close();
		infoBubble.setContent(contentString);
		infoBubble.open(map, ships[mmsi].marker);
	});

	$('#ships>table').append(row);

	google.maps.event.addListener(ship.marker, 'click', function() {
		row.click();
	});
}

//Utility Functions
//Poygon getBounds extension - google-maps-extensions
//http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js
if (!google.maps.Polygon.prototype.getBounds) {
	google.maps.Polygon.prototype.getBounds = function(latLng) {
		var bounds = new google.maps.LatLngBounds();
		var paths = this.getPaths();
		var path;

		for (var p = 0; p < paths.getLength(); p++) {
			path = paths.getAt(p);
			for (var i = 0; i < path.getLength(); i++) {
				bounds.extend(path.getAt(i));
			}
		}

		return bounds;
	};
}

// Polygon containsLatLng - method to determine if a latLng is within a polygon
google.maps.Polygon.prototype.containsLatLng = function(latLng) {
	// Exclude points outside of bounds as there is no way they are in the poly
	var bounds = this.getBounds();

	if (bounds !== null && !bounds.contains(latLng)) {
		return false;
	}

	// Raycast point in polygon method
	var inPoly = false;

	var numPaths = this.getPaths().getLength();
	for (var p = 0; p < numPaths; p++) {
		var path = this.getPaths().getAt(p);
		var numPoints = path.getLength();
		var j = numPoints - 1;

		for (var i = 0; i < numPoints; i++) {
			var vertex1 = path.getAt(i);
			var vertex2 = path.getAt(j);

			if (vertex1.lng() < latLng.lng() && vertex2.lng() >= latLng.lng() || vertex2.lng() < latLng.lng() && vertex1.lng() >= latLng.lng()) {
				if (vertex1.lat() + (latLng.lng() - vertex1.lng()) / (vertex2.lng() - vertex1.lng()) * (vertex2.lat() - vertex1.lat()) < latLng.lat()) {
					inPoly = !inPoly;
				}
			}

			j = i;
		}
	}

	return inPoly;
};

function in_array(array, id) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] == id) {
			return true;
		}
	}
	return false;
}

now.alert = function(message) {
	alert(message);
};