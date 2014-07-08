module.exports = function(app, data) {

	//Routes
	app.get('/mobile', function(req, res) {
		console.log("Received Request");

		data.getEvents(function(docs) {
			result = {
				"events": docs
			};
			console.log("Response Ready");
			res.send(JSON.stringify(result));
		});
	});

	app.get('/event/invalidmmsi/', function (req, res) {
		data.getInvalidMMSI(function(docs) {
			res.send(JSON.stringify(docs));
		});
	});

	app.get('/events/:data', function(req, res) {
		var e = JSON.parse(req.params.data);
		// console.dir(e);

		data.eventExist(e.event, e.mmsi, null, (function(mmsi) {
			return function(err, doc) {
				if (!doc) {
					var ship = {"lon":e.lon, "lat":e.lat};
					data.newEvent(e.event, mmsi, ship);
				}
			};
		})(e.mmsi));
		res.send("");
	});
};