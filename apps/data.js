module.exports = function data(shipsArray) {

	var Db = require('mongodb').Db,
		Connection = require('mongodb').Connection,
		Server = require('mongodb').Server,
		mongo = require('mongodb'),
		ships, events;

	var mongoServer = new Server('localhost', 27017, {
		auto_reconnect: true
	});

	var db = new Db('mRADAR', mongoServer);

	db.open(function(err, db) {

		function initializeShipsArray() {
			//Initialize Ship Array
			var time = new Date();
			time.setMinutes(time.getMinutes() - 10);

			ships.find({
				data: {
					$elemMatch: {
						timestamp: {
							$gte: time
						}
					}
				}
			}, {
				mmsi: true,
				length: true,
				data: {
					$slice: -1
				}
			}).toArray(function(err, docs) {
				if (err) {
					console.warn(err.message); // returns error if no matching object found
				} else {

					//Clear Ship Array
					for (prop in shipsArray) {
						if (shipsArray.hasOwnProperty(prop)) {
							delete shipsArray[prop];
						}
					}

					for (var i = 0; i < docs.length; i++) {
						shipsArray[docs[i].mmsi] = docs[i].data[0];
						shipsArray[docs[i].mmsi].length = docs[i].length;
					}

					console.log(docs.length);
				}
			});

			return initializeShipsArray;
		}

		//DROP TABLE
		//var table = 'events';
		//console.log(">> Dropping Events Collection");
		//db.dropCollection(table, function(err, result) {
		//	console.log("dropped: " + table);
		//	console.dir(result);
		//});
		db.collection('ships', function(err, collection) {
			ships = collection;
			ships.ensureIndex({
				mmsi: 1
			});
			ships.indexInformation(function(err, doc) {
				console.log(doc);
			});

			//TEMP HELPER
			//var helper = require('./helper.js')(ships);
			//helper.shipsWithLength();
			//helper.findShipsWithNoLength();
			//Rerun every 5 Minutes
			//initializeShipsArray();
			setInterval(initializeShipsArray(), (5 * 60 * 1000));
		});

		db.collection('events', function(err, collection) {
			events = collection;
			events.ensureIndex({
				"event-name":1,
				"detection-date-time":1
			});
		});
	});

	return {

		getShip: function(mmsi, callback) {
			ships.findOne({
				'mmsi': mmsi
			}, callback);
		},

		saveShip: function(ship) {

			ships.findAndModify({
				mmsi: ship.mmsi
			}, // query
			[
				['_id', 'asc']
			], // sort order
			{
				$push: {
					data: {
						lat: ship.data.lat,
						lon: ship.data.lon,
						speed: ship.data.speed,
						course: ship.data.course,
						timestamp: new Date()
					}
				}
			}, {
				upsert: true,
				'new': true
			}, // options

			function(err, object) {
				if (err) {
					console.warn(err.message); // returns error if no matching object found
				} else {
					//console.log(object.mmsi + " Updated");
				}
			});
		},

		getEvents: function(callback) {
			events.find({}, {
				_id: false,
				"limit": 100,
				"sort": [
					['detection-date-time', 'desc']
				]
			}).toArray(function(err, docs) {
				if (err)	console.err(err);
				callback(docs);
			});
		},

		getInvalidMMSI: function(callback) {
			events.find({
				"event-name": "Invalid MMSI"
			}, {
				"ships.mmsi": true,
				_id: false
			}).toArray(function(err, docs) {
				if (err)	console.err(err);
				var array = [];
				for (var i = 0; i < docs.length; i++) {
					array.push(docs[i].ships[0].mmsi);
				}
				callback(array);
			});
		},

		//Has Problems
		// eventExist: function(mmsi1, mmsi2, callback) {
		// 	events.findOne({
		// 		ships: {
		// 			$elemMatch: {
		// 				mmsi: mmsi1
		// 			},
		// 			$elemMatch: {
		// 				mmsi: mmsi2
		// 			}
		// 		}
		// 	}, callback);
		// },
		eventExist: function(eventType, mmsi1, mmsi2, callback) {
			switch (eventType) {

			case 1:

				events.findOne({
					'event-name': "Ship Brushing",
					ships: {
						$elemMatch: {
							mmsi: mmsi1
						},
						$elemMatch: {
							mmsi: mmsi2
						}
					}
				}, callback);
				break;
			case 2:
				break;
			case 3:
				events.findOne({
					'event-name': "Missing Flag",
					ships: {
						$elemMatch: {
							mmsi: mmsi1
						}
					}
				}, callback);
				break;
			case 4:
				events.findOne({
					'event-name': "Invalid MMSI",
					ships: {
						$elemMatch: {
							mmsi: mmsi1
						}
					}
				}, callback);
				break;

			case 5:
			events.findOne({
				'event-name': "New Ship",
				ships: {
					$elemMatch: {
						mmsi: mmsi1
					}
				}
			}, callback);
			break;

			default:
				break;
			}
		},

		newEvent: function(eventType, mmsi1, ship1, mmsi2, ship2) {

			// Event types for mRADAR prototype
			// Type 1 : Ship Brushing (Domain Violation)
			// Type 2 : Zone Violation
			// Type 3 : Missing Flag
			// Type 4 : Invalid MMSI
			// Type 5 : New Ship
			var doc;
			
			switch (eventType) {

			case 1:
				doc = {
					"event-name": "Ship Brushing",
					"description": "A ship is too close to another ship",
					"detection-date-time": new Date(),
					"priority": Math.floor(Math.random() * 8) + 2,
					"for-user": 1123,
					"ships": [{
						"mmsi": mmsi1,
						"ship-name": "Rio De Janeiro",
						"ship-type-id": Math.floor(Math.random() * 80) + 20,
						"ship-type-name": "Container Ship",
						"year-built": (1950 + Math.floor(Math.random() * 62)),
						"length": ship1.length,
						"breadth": Math.floor(ship1.length / 5),
						"gross-tonnage": Math.floor(Math.random() * 100) * ship1.length,
						"deadweight": Math.floor(Math.random() * 150) * ship1.length,
						"speed-max": 12.5,
						"speed-average": 9.1,
						"country": "DE",
						"callsign": "DDID2",
						"lat": ship1.lat,
						"lon": ship1.lon
					}, {
						"mmsi": mmsi2,
						"ship-name": "Artistry",
						"ship-type-id": Math.floor(Math.random() * 80) + 20,
						"ship-type-name": "Oil/Chemical Tanker",
						"year-built": (1950 + Math.floor(Math.random() * 62)),
						"length": ship2.length,
						"breadth": Math.floor(ship2.length / 5),
						"gross-tonnage": 5256,
						"deadweight": 9040,
						"speed-max": 8.7,
						"speed-average": 7.3,
						"country": "SG",
						"callsign": "9VCS3",
						"lat": ship2.lat,
						"lon": ship2.lon
					}]
				};
				console.log("Ship Brushing");
				break;

			case 2:
				doc = {
					"event-name": "Zone Violation",
					"description": "Ship " + mmsi1 + " detected in restricted zone",
					"detection-date-time": new Date(),
					"priority": 10,
					"for-user": 1123,
					"ships": [{
						"mmsi": mmsi1,
						"ship-name": "Marin Dei",
						"ship-type-id": Math.floor(Math.random() * 80) + 20,
						"ship-type-name": "Chemical Ship",
						"year-built": 2004,
						"length": Math.floor(Math.random() * 50) + 20,
						"breadth": Math.floor(Math.random() * 10) + 10,
						"gross-tonnage": Math.floor(Math.random() * 100) * ship1.length,
						"deadweight": Math.floor(Math.random() * 150) * ship1.length,
						"speed-max": 10.5,
						"speed-average": 7.1,
						"country": "BZ",
						"callsign": "DVFD2",
						"lat": ship1.lat,
						"lon": ship1.lon
					}]
				};
				console.log("Zone Violation" + mmsi1);
				break;

			case 3:
				doc = {
					"event-name": "Missing Flag",
					"description": "No record of ship flag information",
					"detection-date-time": new Date(),
					"priority": 3,
					"ships": [{
						"mmsi": mmsi1,
						"lat": ship1.lat,
						"lon": ship1.lon
					}]
				};
				console.log("Missing Flag" + mmsi1);
				break;

			case 4:
				doc = {
					"event-name": "Invalid MMSI",
					"description": "Suspicious ship MMSI information",
					"detection-date-time": new Date(),
					"priority": 6,
					"ships": [{
						"mmsi": mmsi1,
						"lat": ship1.lat,
						"lon": ship1.lon
					}]
				};
				console.log("Invalid MMSI" + mmsi1);
				break;

			case 5:
				doc = {
					"event-name": "New Ship",
					"description": "Ship has never been to Singapore port before",
					"detection-date-time": new Date(),
					"priority": 2,
					"ships": [{
						"mmsi": mmsi1,
						"lat": ship1.lat,
						"lon": ship1.lon
					}]
				};
				console.log("New Ship " + mmsi1);
				break;

			default:
				break;
			}

			events.insert(doc);
		}
	};
};