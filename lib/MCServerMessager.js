/*
*
*	Minecraft Server Messager by Alexei Liulin   codwizard[at]gmail[dot]com
*
*
*	Client Login request packet:
*	+------+-------------------------+-------------------------+----------------+---------------------------+------------------+
*	| 0x02 | Protocol version (8bit) | Username Length (16bit) | Username (var) | Servername Length (16bit) | Servername (var) |
*	+------+-------------------------+-------------------------+----------------+---------------------------+------------------+
*
*	Disconnect response with message:
*	+------+------------------------+---------------+
*	| 0xFF | Message Length (16bit) | Message (var) |
*	+------+------------------------+---------------+
*
*
*	Server List Ping protocol reference:             http://wiki.vg/Server_List_Ping
*	MC client version and protocol version matching: http://wiki.vg/Protocol_version_numbers
*
*
*	TESTED ON: 1.5.1 and 1.6.2 clients
*
*
*	USAGE:
*
*	var MCSM = require("./MCServerMessager");
*
*	var mcsm = new MCSM({
*		host: "0.0.0.0"
*	});
*
*	mcsm.start();
*
*	setTimeout(function() {
*		mcsm.stop();
*	}, 3600000);
*
*
*/

var net = require('net');
var iconv = require('iconv-lite');

/**
*	MCServerMessager Constructor
*
*	@param	options	The options object
*/
var MCServerMessager = function(options) {

	//default options
	this.options = {
		host: "127.0.0.1",
		port: 25565,
		message: "GRAB A COFFEE, WORK IN PROGRESS",
		motd: "WORK IN PROGRESS",
		players: "0",
		maxPlayers: "10",
		protocolVersion: "73",
		reportedVersion: "Offline",
	};

	//Partial or full default options override
	if(typeof(options) === "object") {
		for(var p in options)
			if(this.options.hasOwnProperty(p))
				this.options[p] = options[p];
	}


	this.active = false;
	this.server = null;
}


/**
*	Options getter
*/
MCServerMessager.prototype.getOption = function(optionName) {
	if(this.options.hasOwnProperty(optionName))
		return this.options[optionName];
	else return "Invalid option";
}

/**
*	Options setter
*/
MCServerMessager.prototype.setOption = function(optionName, optionValue) {
	if(this.options.hasOwnProperty(optionName)) {
		this.options[optionName] = optionValue;

		console.log("[*] " + optionName + " option was set to " + optionValue);
	} else return "Invalid option";
}


/**
*	Starts the MCSM server
*/
MCServerMessager.prototype.start = function() {
	if(!this.active) {
		this.server = net.createServer();

		var that = this;

		this.server.on("connection", function(con) {
			onConnect(con, that);
		});

		this.server.on("listening", function() {
			console.log("[*] MC Server Messager started @ " + that.options.host + ":" + that.options.port);

			that.active = true;
		});

		this.server.on("close", function() {
			console.log("[-] Shutting down the server...");

			this.active = false;
		});

		this.server.on("error", function(err) {
			console.log("[!] Oops. Some bad things happened :(");
			console.log(err);
		});

		this.server.listen(this.options.port, this.options.host);

	} else console.log("[!] MCSM is already running!");
}

/**
*	Stops the MCSM server
*/
MCServerMessager.prototype.stop = function() {
	if(this.active) {
		var that = this;

		this.server.close(function() {
			console.log("[-] MC Server Messager has been stopped");

			that.active = false;
		});
	} else console.log("[!] MCSM is already stopped");
}

/**
*	Handles login and server info requests from Minecraft clients
*
*	@param con	MC client TCP socket
*	@param that Reference to MCServerMssage instance
*
*/
function onConnect(con, that) {

	con.on("data", function(buf) {
		var type = buf.readUInt8(0);

		switch (type) {
			case 0x02:   //Login request, respond with info message for MC v1.5 and v1.6
			
				var protocolVersion = buf.readUInt8(1);

				//Get the username of the client
				var usernameLength = buf.readUInt16BE(2);
				var username = new Buffer(usernameLength);
				buf.copy(username, 0, 4, 4 + usernameLength*2);

				//Get the servername to which the client si trying to connect
				var servernameLength = buf.readUInt16BE(4 + usernameLength*2);
				var servername = new Buffer(servernameLength);
				buf.copy(servername, 0, 6 + usernameLength*2, 6 + usernameLength*2 + servernameLength*2);

				console.log("[+] Responding to login request from " + iconv.decode(username, "utf16-be") + "@"
					+ con.remoteAddress + ":" + con.remotePort + " (v" + protocolVersion + ") ======> "
					+ iconv.decode(servername, "utf16-be"));

				//Build the responce packet
				var message = new Buffer(iconv.encode(that.options.message, "utf16-be"));

				var buf = new Buffer(3 + message.length);

				buf.writeUInt8(0xff, 0);
				buf.writeUInt16BE(message.length / 2, 1);
				message.copy(buf, 3, 0, message.length);

				con.write(buf);
				con.end();
			break;

			case 0xFE: //Server list ping for MC v1.5 and v1.6

				console.log("[+] Responding to server info request from " + con.remoteAddress + ":" + con.remotePort
					+ " protocol v" + protocolVersion);

				var length = 9 + 2*(that.options.protocolVersion.length + 1 + that.options.reportedVersion.length + 1
					+ that.options.motd.length + 1 + that.options.players.length + 1 + that.options.maxPlayers.length + 1);

				var buf = new Buffer(length);
				var offset = 0;

				//initial bytes
				buf.writeUInt8(0xff, (offset++));				//kick packet, byte
				buf.writeUInt16BE((length - 3) / 2, offset);	//proceeding string length, BE short
				offset+=2;

				//UTF-16BE encoded strings delimited by null character 0x0000

				//Strings beginning: 00 a7 00 31 00 00
				var delim = new Buffer([0x00, 0xa7, 0x00, 0x31, 0x00, 0x00]);
				delim.copy(buf, offset, 0, delim.length);
				offset+=delim.length;

				//protocol version, e.g. 47
				var protocolVersion = new Buffer(iconv.encode(that.options.protocolVersion, "utf16-be"));
				protocolVersion.copy(buf, offset, 0, protocolVersion.length);
				offset+=protocolVersion.length;
				buf.fill(0x00, offset, (offset += 2));

				//Reported Minecraft server version, e.g. 1.4.2
				var reportedVersion = new Buffer(iconv.encode(that.options.reportedVersion, "utf16-be"));
				reportedVersion.copy(buf, offset, 0, reportedVersion.length);
				offset+=reportedVersion.length;
				buf.fill(0x00, offset, (offset += 2));

				//MOTD
				var MOTD = new Buffer(iconv.encode(that.options.motd, "utf16-be"));
				MOTD.copy(buf, offset, 0, MOTD.length);
				offset+=MOTD.length;
				buf.fill(0x00, offset, (offset += 2));

				//Current player count
				var currentPlayers = new Buffer(iconv.encode(that.options.players, "utf16-be"));
				currentPlayers.copy(buf, offset, 0, currentPlayers.length);
				offset+=currentPlayers.length;
				buf.fill(0x00, offset, (offset += 2));

				//Max players
				var maxPlayers = new Buffer(iconv.encode(that.options.maxPlayers, "utf16-be"));
				maxPlayers.copy(buf, offset, 0, maxPlayers.length);
				offset+=maxPlayers.length;
				buf.fill(0x00, offset, (offset += 2));

				con.write(buf);
				con.end();

			break;

			default:   // No idea of type, just close the connection
				con.end();
			break;
		}
	});

	con.on("error", function(err) {
		console.log("[!] Oops. An error occured while communicating with client\n", err);
	});
}

module.exports = MCServerMessager;
