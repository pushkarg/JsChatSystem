// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
var webSocketsServerPort = 5000;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */

// list of currently connected clients (users)
var clients = new Array(10);	// There can be 10 chat rooms
var history = new Array(10)
var clientNames = new Array(10);
for(var i=0;i<10;i++){	//Create an empty history & client list for each of the 10 chat rooms
	clients[i] = new Array(0);
	history[i] = new Array(0);
	clientNames[i] = new Array(0);
}


//////////////////
//////////////////

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Array with some colors
var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
// ... in random order
colors.sort(function(a,b) { return Math.random() > 0.5; } );

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. To be honest I don't understand why.
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
	wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    // accept connection - you should check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin); 
    var index;
    var userName = false;
    var userColor = false;
	var chatRoomNum =999;

    console.log((new Date()) + ' Connection accepted.');


    // user sent some message
    connection.on('message', function(message) {
        if (message.type === 'utf8') { // accept only text
            if (userName === false) { // first message sent by user is their name


                // get the user name  & chat room number from the Json string
            	var json = JSON.parse(message.utf8Data);
				chatRoomNum = json.chatRoomNum - 1;
				if(json.type == "chatRoomList"){
					var roomNum = parseInt(json.option);
					console.log("Asking for  : " + roomNum);
        			connection.sendUTF(JSON.stringify( { type: 'memberList', data: clientNames[roomNum - 1] , roomNum:roomNum ,count:clientNames[roomNum - 1].length } ));
					console.log("send : " + clientNames[roomNum - 1][0]);
					//for(var o=0;o<5;o++)
						//console.log("cl : " + clientNames[o][0] + " , for o : " + o);
					return;
				}

    			// we need to know client index to remove them on 'close' event
    			index = clients[chatRoomNum].push(connection) - 1;
    			// send back chat history
    			if (history[chatRoomNum].length > 0) {
        			connection.sendUTF(JSON.stringify( { type: 'history', data: history[chatRoomNum]} ));
    			}


                userName = htmlEntities(json.name);
				clientNames[chatRoomNum].push(userName);
                // get random color and send it back to the user
                userColor = colors.shift();
                connection.sendUTF(JSON.stringify({ type:'color', data: userColor }));
                console.log((new Date()) + ' User is known as: ' + userName
                            + ' with ' + userColor + ' color.' + ' , in room : ' + chatRoomNum );

            } else { // log and broadcast the message
                console.log((new Date()) + ' Received Message from '
                            + userName + ': ' + message.utf8Data);
                
                // we want to keep history of all sent messages
                var obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(message.utf8Data),
                    author: userName,
                    color: userColor
                };
                history[chatRoomNum].push(obj);
                history[chatRoomNum].slice(-100);

                // broadcast message to all connected clients
                var json = JSON.stringify({ type:'message', data: obj });
                for (var i=0; i < clients[chatRoomNum].length; i++) {
                    clients[chatRoomNum][i].sendUTF(json);
                }
            }
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        if (userName !== false && userColor !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected.");
            // remove user from the list of connected clients
            clients[chatRoomNum].splice(index, 1);
            // push back user's color to be reused by another user
            colors.push(userColor);
        }
    });

});
