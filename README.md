# MCServerMessager (mcsm)
Like the all known MC Sign On Door. Provide a message to users when your server is offline.

## Usage
Make sure you install it from npm like so:

> npm install mcsm

To use Mcsm you need to create a new instance of the MCServerMessager class, like so:
```javascript
var MCServerMessager = require('./lib/MCServerMessager');

var mcsm = new MCServerMessager({
	host: "0.0.0.0",
    port: "25565",
	message: "The server will be up soon. Grab a coffee :P",
	players: "0",
	maxPlayers: "48",
	motd: "Yaaay it almost works",

	reportedVersion: "1.8.3",
	protocolVersion: "47"

});

// Satrt the listener
mcsm.start();
```

Here's a list of the supported options:
- host: The host IP to listen on (default: 0.0.0.0 or all interfaces)
- port: The port to listen on (default: 25565)
- message: The message that will be shown to players when they connect.
- motd: The message/motd that shows up in the serverlist on the client.
- players: The amount of connected players that will show up in the serverlist.
- maxPlayers: The maximum amount of players that shows up in the serverlist.
- reportedVersion: The version to report to clients.
- protocolVersion: The version of the Minecraft protocol to use.

## API

An MCServerMessager instance has a few methods to facilitate integrating it into your project:

### setOption(name, value)

Changes the value of an option.

### getOption(name)

Returns the value for an option.

### start()

Start listening for clients.

### stop()

Stop listening for clients. The port will be free again.
