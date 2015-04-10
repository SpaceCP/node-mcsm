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
*	Client server info (MOTD) request packet:
*	+------+---------------------+
*	| 0xFE | MOTD version (8bit) |
*	+------+---------------------+
*
*
*	Disconnect response with message:
*	+------+------------------------+---------------+
*	| 0xFF | Message Length (16bit) | Message (var) |
*	+------+------------------------+---------------+
*
*	MOTD v0 response:
*	+------+-----------------------+------------+--------+---------------------+--------+------------------------+
*	| 0xFF | Packet Length (16bit) | MOTD (var) | 0x00A7 | PlayersNumber (var) | 0x00A7 | MaxPlayersNumber (var) |
*	+------+-----------------------+------------+--------+---------------------+--------+------------------------+
*
*	MOTD v1 (protocol version 47 update) responce:
*	+----------------+----------------+-----+---------------------+--------+------------------------+--------+--------+-----------------
*	| 0xFF00 | Payload Length (16bit) |A700 | MOTD Version (8bit) | 0x0000 | Protocol Version (var) | 0x0000 | Reported Version (var) |
*	+----------------+----------------+-----+---------------------+--------+------------------------+--------+--------+-----------------
*
*	-+--------+-------------+--------+----------------------+--------+--------------------------+--------+
*	 | 0x0000 |  MOTD (var) | 0x0000 | Players Online (var) | 0x0000 | Max PLayers Online (var) | 0x0000 |
*	-+--------+-------------+--------+----------------------+--------+--------------------------+--------+
*
*	NOTE: The strings are UTF16-BE encoded
*
*	TESTED ON: 1.5.1 client
*
*
*
*
*	USAGE:
*
*	var MCSM = require("./MCServerMessager");
*
*	var mcsm = new MCSM({
*		host: "192.168.0.4"
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

/**
*	MCServerMessager Constructor
*
*	@param	options	The options object
*/
var MCServerMessager = function(options) {

	this.options = {	//default options
		host: "127.0.0.1",
		port: 25565,
		message: "GRAB A COFFEE, WORK IN PROGRESS",
		motd: "WORK IN PROGRESS",
		players: "0",
		maxPlayers: "10",
		protocolVersion: "60",
		reportedVersion: "Offline"
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
			case 0x02:   //Login request, respond with info message
				var protocolVersion = buf.readUInt8(1);

				var usernameLength = buf.readUInt16BE(2);
				var usernameBuffer = subBuf(buf, 4, 4 + usernameLength*2);
				var username = UTF16_BE2LE(usernameBuffer).toString("utf-16le", 0, usernameLength * 2);

				var servernameLength = buf.readUInt16BE(4 + usernameLength*2);
				var servernameBuffer = subBuf(buf, 6 + usernameLength*2, 6 + usernameLength*2 + servernameLength*2);
				var servername = UTF16_BE2LE(servernameBuffer).toString("utf-16le", 0, servernameLength * 2);
				////////////
				console.log("[+] Responding to login request from " + username + "@" +
					con.remoteAddress + ":" + con.remotePort + " (v" + that.options.protocolVersion + ") ======> " + servername);
				///////////

				var message = that.options.message;
				var messageBuffer = UTF16_LE2BE(
					new Buffer(message, "utf-16le")
					);

				var responceBuffer = new Buffer(3 + messageBuffer.length);

				responceBuffer.writeUInt8(0xff, 0);
				responceBuffer.writeUInt16BE(message.length, 1);
				for(var i=0; i<responceBuffer.length - 3; i++)
					responceBuffer[i + 3] = messageBuffer[i];

				con.write(responceBuffer);
				con.end();
			break;

			case 0xFE: 	//Server status request, send MOTD and player ratio info
				var motdVersion = buf.readUInt8(0);	//second packet has the MOTD version in it

				console.log("[+] Responding to server info request from " + con.remoteAddress + ":" + con.remotePort
					+ " MOTD v" + ((motdVersion === 0) ? 0 : 1));

				var newBuf = null;

				if(motdVersion === 0) {//MOTD v0 for old clients
					//
				} else {	//MOTD v1 for modern clients
					var len = 19 + 2*(that.options.protocolVersion.length + that.options.reportedVersion.length + that.options.motd.length
							+ that.options.players.length + that.options.maxPlayers.length) + 000010;
					newBuf = new Buffer(len);
					var tmp = new Buffer(len);

				/*	fill the buffer with As for easier packet construction debugging
					newBuf.fill(0xAA);
					tmp.fill(0xAA);
				*/

					newBuf.writeUInt8(0xFF, 0);
					newBuf.writeUInt8(0x00, 1);
					newBuf.writeUInt16LE(Math.floor((len - 4)/ 2), 2);	//packet payload lngth

					newBuf.writeUInt8(0xA7, 4);
					newBuf.writeUInt8(0x00, 5);
					newBuf.writeUInt8("1".charCodeAt(0), 6);	//motd version
					newBuf.writeUInt8(0x00, 7);
					newBuf.writeUInt8(0x00, 8);

					var offset = 9;


					//protocol version string
					tmp.write(that.options.protocolVersion, offset, that.options.protocolVersion.length*2, "utf-16le");
					tmp = UTF16_LE2BE(tmp, offset % 2);

					bufCpy(tmp, offset, that.options.protocolVersion.length*2, newBuf);

					offset += that.options.protocolVersion.length*2;
					newBuf.fill(0x00, offset, (offset += 2));


					//reported version string
					tmp.write(that.options.reportedVersion, offset, that.options.reportedVersion.length*2, "utf-16le");
					tmp = UTF16_LE2BE(tmp, offset % 2);

					bufCpy(tmp, offset, that.options.reportedVersion.length*2, newBuf);

					offset += that.options.reportedVersion.length*2;
					newBuf.fill(0x00, offset, (offset += 2));


					//motd string
					tmp.write(that.options.motd, offset, that.options.motd.length*2, "utf-16le");
					tmp = UTF16_LE2BE(tmp, offset % 2);

					bufCpy(tmp, offset, that.options.motd.length*2, newBuf);

					offset += that.options.motd.length*2;
					newBuf.fill(0x00, offset, (offset += 2));


					//online players number string
					tmp.write(that.options.players, offset, that.options.players.length*2, "utf-16le");
					tmp = UTF16_LE2BE(tmp, offset % 2);

					bufCpy(tmp, offset, that.options.players.length*2, newBuf);

					offset += that.options.players.length*2;
					newBuf.fill(0x00, offset, (offset += 2));


					//MAX online players number string
					tmp.write(that.options.maxPlayers, offset, that.options.maxPlayers.length*2, "utf-16le");
					tmp = UTF16_LE2BE(tmp, offset % 2);

					bufCpy(tmp, offset, that.options.maxPlayers.length*2, newBuf);

					offset += that.options.maxPlayers.length*2;
					newBuf.fill(0x00, offset, (offset + 2));


					con.write(newBuf);
					con.end();
				}
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

//extracts some data from buffer
function subBuf(buffer, from, to) {
	var length = to - from;

	var buf = new Buffer(length);

	for(var i=0; i<length; i++)
		buf[i] = buffer[from++];

	return buf;
}

//BigEndian <=> LittleEndian conversion
function UTF16_BE2LE(buffer, offset) {
	if(typeof(offset) ==='undefined')	//need when the UTF-16 string starts at the odd offset
		offset = 0;

	var tmp;

	for(var i=0; i<buffer.length; i += 2) {
		tmp = buffer[offset + i];
		buffer[offset + i] = buffer[offset + i+1];
		buffer[offset + i+1] = tmp;
	}

	return buffer;
}

var UTF16_LE2BE = UTF16_BE2LE;

//Copies some data from one buffer to another
function bufCpy(source, from, length, dest) {
	for(var i=0; i<length; i++)
		dest[from+i] = source[from+i];
}

/////////////////////////////////

module.exports = MCServerMessager;
