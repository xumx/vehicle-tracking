module.exports = function rules(ships, everyone, data) {

	var distance = function(x1, y1, x2, y2) {
			return Math.sqrt(Math.pow((x1 - x2) * Math.PI / 180, 2) + Math.pow((y1 - y2) * Math.PI / 180, 2));
		};

	var notify = function(ship, mmsi, s) {
				if (everyone.now.domainViolation !== undefined) everyone.now.domainViolation(ship.mmsi, ship.data, mmsi, s);

				var callback = function(err, doc) {
					if (err)	console.err(err);
						if (doc) {
							console.log("Event already exists");
						} else {
							//New brushing event
							data.newEvent(1, ship.mmsi, ship.data, mmsi, s);
						}
						return;
					};
				data.eventExist(1, ship.mmsi, mmsi, callback);
				return;
		};

	return {
	
		domainViolation: function(ship) {

			var begin = new Date().getTime();

			data.getShip(ship.mmsi, function(err, doc) {
				ship.data.length = doc.length;
				if (!ship.data.length) {
					ship.data.length = 40;
				}
				for (var mmsi in ships) {
					s = ships[mmsi];
					if(s.length === undefined) s.length = 40;
					
					if (ship.mmsi != mmsi) {
						if ((distance(s.lat, s.lon, ship.data.lat, ship.data.lon) * 6371000) < (s.length + ship.data.length - 10)) {
							notify(ship, mmsi, s);
						}
					}
				}
			});


			console.log( new Date().getTime() - begin );
		},

		inRange: function(ship) {
			var inRange = (ship.data.lat < 2 && ship.data.lat > 1 && ship.data.lon > 103 && ship.data.lon < 105);

			if (!inRange) {
				//Not In Range
				console.log(ship.data.lat + ", " + ship.data.lon + " is out of range");
			}
			return inRange;
		}
	};
};