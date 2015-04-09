var MCServerMessager = require('./lib/MCServerMessager');

var mcsm = new MCServerMessager({
	host: "192.168.0.9",
	message: "§4§lThe server will be up in an hour. Grab a coffe :P",
	motd: "WORK IN PROGRESS",
	players: "0",
	maxPlayers: "64"
});

mcsm.start();

setTimeout(function() {
	mcsm.start();
}, 2000);

setTimeout(function() {
	mcsm.stop();
}, 10000);

setTimeout(function() {
	mcsm.stop();
}, 11000);

setTimeout(function() {
	mcsm.start();
}, 15000);