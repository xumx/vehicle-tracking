handleAIS = (msg, rinfo) ->
	try
		ship = JSON.parse(msg.toString())
	catch err
		console.err("Parse Error")
		return

	if rules.inRange ship
		ships[ship.mmsi] = ship.data
		everyone.now.updateShip ship unless everyone.now.updateShip is undefined

		if realtime is true 
			data.saveShip ship
			rules.domainViolation ship

realtime = ((process.argv[2] == 'realtime') ? true : false)
if not realtime
	replay = process.argv[2]

udpPort = 42345
httpPort = 8083
ships = {}
udp = require("dgram").createSocket("udp4")
exp = require("express")
app = exp.createServer()
app.use exp.static("public")

server = app.listen(httpPort)

if realtime is true
	#Realtime Mode
	data = require('./apps/data')(ships)
	routes = require('./apps/routes')(app, data)
	everyone = require('./apps/live')(server, ships, data)
	rules = require('./apps/rules')(ships, everyone, data)

	# Wait 1 second for Database to be ready
	setTimeout(()->
		udp.on "message", handleAIS
	, 1000)
	
else
	# Replay mode is designed for simplicity of setting up a quick demo.
	# Mongo DB is not included. All database functionalities will not work
	lineReader = require('./apps/FileLineReader')('./apps/' + replay, 500000000)
	routes = require('./apps/routes')(app)
	everyone = require('./apps/live')(server, ships)
	rules = require('./apps/rules')(ships, everyone)

	# Replay Data at a fixed Rate (Default: 5)
	packetsPerSecond = 5

	setInterval(()->
		if(lineReader.hasNextLine())
			handleAIS lineReader.nextLine(),null
	, 1000/packetsPerSecond)

udp.bind udpPort