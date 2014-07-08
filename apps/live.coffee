live = (server,ships,data) ->

	nowjs = require("now")
	everyone = nowjs.initialize(server)

	nowjs.on "connect", ->
		@now.start ships

	distance = (x1, y1, x2, y2) ->
		Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2))

	everyone.now.getStatistics = ->
		sensorLon = 103.798635
		sensorLat = 1.275100
		numberOfShips = Object.keys(ships).length
		maxDistanceFromSensor = 0
		numberOfAnchoredShips = 0
		for mmsi of ships
			continue  unless ships.hasOwnProperty(mmsi)
			ship = ships[mmsi]
			numberOfAnchoredShips++  if ship.speed is 0
			distanceFromSensor = distance(sensorLat,sensorLon,ship.lat,ship.lon)
			maxDistanceFromSensor = distanceFromSensor  if distanceFromSensor > maxDistanceFromSensor and distanceFromSensor < 1
		maxDistanceFromSensor = new Number(maxDistanceFromSensor * 110)
		
		stats =
			numberOfShips: numberOfShips
			numberOfAnchoredShips: numberOfAnchoredShips
			maxDistanceFromSensor: maxDistanceFromSensor.toPrecision(3)

		@now.printStatistics stats

	everyone.now.subscribe = (list)->
		list

	# Temp
	everyone.now.getAPL = [566318000,566319000,636091803,636091804,636091805,636091800,311006900,370407000,355443000,356575000,477218500,477261600,249851000,249899000,249966000,636013521,636013522,564397000,564897000,636013456,636013457,235061354,477111300,477217300,235070188,636014410,370792000,354851000,371380000,636011627,564510000,636012155,564512000,563776000,563754000,563722000,563726000,636090642,636091155,636091157,636091156,369247000,368685000,368680000,368686000,368684000,367403740,367403460,367403790,367403450,367478280,564303000,564537000,366818000,366376000,368591000,368598000,563232000,354876000,636090624,636090618,636090620,565360000,563831000,477958400,304454000,305192000,305193000,305194000,305195000,564245000,563858000,563791000,563717000,538004599,538004600,636091862,636091863,636091894,636091893,305386000,305387000,636091765,636091766,304149000,304151000,304150000,563097000,563147000,563246000,477214400,636091448,210346000,477581100,636091703,563579000,565089000,636091237,636091445,636091307,636091308,636091417,636091298,563498000,563266000,564763000,564619000,636091978,218743000,356902000,304010564,636015184,210315000,538002747,538003120,246650000,305208000,305147000,244700610,305567000,240610000,305213000,417222333,351566000,636090936,636092238,246255000,211476540,367331160,564579000,564418000,259963000,277367000,367141680,564727000,338279000,525019103];

	# Mailer
	mail = require("mail").Mail(
		host: "smtp.gmail.com"
		username: "deepthought@gmail.com"
		password: "wsffpnpudylxajhl"
	)

	everyone.now.events = (mmsi, ship) ->
		console.log("event received")
		console.dir(ship)
		data.newEvent 2, mmsi, ship

	everyone.now.email = (email, mmsi) ->
		ship = ships[mmsi]
		body = "Ship " + mmsi + " is now at position Lat:" + ship.lat + " Lon:" + ship.lon + ". \n traveling at a speed of " + ship.speed + " Knots. \nEstimated Time of Arrival: 5:26pm"
		mail.message(
			from: "venky@sis.smu.edu.sg"
			to: [ email ]
			subject: "Hello from Node.JS"
		).body(body).send (err) ->
			throw err  if err
			console.log "Sent!"


	return everyone

module.exports = live