
var MCServerMessager = require('./lib/MCServerMessager');

var mcsm = new MCServerMessager({
	host: "0.0.0.0", // Listen on all interfaces
	message: "The server will be up soon. Grab a coffee :P",
	players: "0",
	maxPlayers: "48",
	motd: "Yaaay it almost works",

	//reportedVersion: "1.5.1",	//MC client version
	//protocolVersion: "60",		//MC protocol version

	//reportedVersion: "1.6.2",
	//protocolVersion: "74",

	reportedVersion: "1.8.3",
	protocolVersion: "47"
	
});

mcsm.start();

setTimeout(function() {
	mcsm.stop();
	mcsm.setOption("message", "Just give me five more minutes...");
	mcsm.setOption("motd", "Almost up :D");
	mcsm.start();
}, 3300000);

setTimeout(function() {
	mcsm.stop();
}, 3600000);
