TITLE=mRADAR
CD "C:\AIS\Setup\mongodb\bin"
start mongod
TIMEOUT /T 3
CD "C:\AIS\VT"
start node server realtime
TIMEOUT /T 3
start http://localhost:8083/
ECHO Node Server Started at localhost:8083