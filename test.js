var MCServerMessager = require('./lib/MCServerMessager');

var mcsm = new MCServerMessager({
	host: "192.168.0.9",
	message: "§4§lThe server will be up in an hour. Grab a coffe :P",
	motd: "WORK IN PROGRESS",
	players: "0",
	maxPlayers: "64"
});