$(function () {
	"use strict";

	// for better performance - to avoid searching in DOM
	var content = $('#content');
	var input = $('#input');
	var status = $('#status');
	var joinButton = document.getElementById("joinButton");
	var chatRoom = $('#chatRoom');
	//var selectBox =document.getElementById("chatRoomList");
	var selectBox = $('chatRoomList');
	var firstLoad = 1;

	// my color assigned by the server
	var myColor = false;
	// my name sent to the server
	var myName = false;

	// if user is running mozilla then use it's built-in WebSocket
	window.WebSocket = window.WebSocket || window.MozWebSocket;

	// if browser doesn't support WebSocket, just show some notification and exit
	if (!window.WebSocket) {
		content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
								    + 'support WebSockets.'} ));
		input.hide();
		$('span').hide();
		return;
	}

	// open connection
	var connection = new WebSocket('ws://192.168.0.9:5000');
	//var connection = new WebSocket('ws://127.0.0.1:5000');

	connection.onopen = function () {
		// first we want users to enter their names
		input.removeAttr('disabled');
		status.text('Name:');
	};

	connection.onerror = function (error) {
		// just in there were some problems with conenction...
		content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
								    + 'connection or the server is down.</p>' } ));
	};

	// most important part - incoming messages
	connection.onmessage = function (message) {
		// try to parse JSON message. Because we know that the server always returns
		// JSON this should work without any problem but we should make sure that
		// the massage is not chunked or otherwise damaged.
		try {
			var json = JSON.parse(message.data);
		} catch (e) {
			console.log('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}

		// NOTE: if you're not sure about the JSON structure
		// check the server source code above
		if (json.type === 'color') { // first response from the server with user's color
			myColor = json.data;
			status.text(myName + ': ').css('color', myColor);
			input.removeAttr('disabled').focus();
			// from now user can start sending messages
		} else if (json.type === 'history') { // entire message history
			// insert every single message to the chat window
			for (var i=0; i < json.data.length; i++) {
				addMessage(json.data[i].author, json.data[i].text,json.data[i].color, new Date(json.data[i].time));
			}
		} else if (json.type === 'message') { // it's a single message
			input.removeAttr('disabled'); // let the user write another message
			addMessage(json.data.author, json.data.text,
					   json.data.color, new Date(json.data.time));
		}else if(json.type === 'memberList'){
			console.log("got member list : " + json.data);
			var otherMembers = $('#otherMembers');
			otherMembers.html("Other Members in Chat room " +json.roomNum + " are : "+  json.data);
			if(json.count == 0)
				otherMembers.html("There is no one else in Chat room " +json.roomNum);
		} else {
			console.log('Hmm..., I\'ve never seen JSON like this: ', json);
		}
	};

	/**
	 * Send mesage when user presses Enter key
	 */
	input.keydown(function(e) {
		if (e.keyCode === 13) {
			var msg = $(this).val();
			if (!msg) {
				return;
			}
			// send the message as an ordinary text
			connection.send(msg);
			$(this).val('');
			// disable the input field to make the user wait until server
			// sends back response
			input.attr('disabled', 'disabled');

			// we know that the first message sent from a user their name
			if (myName === false) {
				myName = msg;
			}
		}
	});

	$("select").change( function(e){
				var selectedRoomText =  $("select option:selected").text()  ;
				var chatRoomNum = selectedRoomText.substr(  selectedRoomText.length -1 , 1);
				var msg = JSON.stringify( { option: chatRoomNum ,type:"chatRoomList"} );
				if(firstLoad==1){
					firstLoad=0;
					return;
				}
				connection.send(msg);
					
			}
		).trigger('change');

	joinButton.onclick=function(e){
		var userName = $(input).val();
		//var chatRoomNum = chatRoom.val();
		if(!userName){
			alert("User name missing. Please enter !");
			return;
		}

		var selectedRoomText =  $("select option:selected").text()  ;
		var chatRoomNum = selectedRoomText.substr(  selectedRoomText.length -1 , 1);
		var msgSent = JSON.stringify( { name: userName , chatRoomNum: chatRoomNum,type :"click" } );
		connection.send(msgSent);
		console.log("sending : " + userName );
		$(input).val('');
		$('#chatRoomPart').hide();
		if (myName === false) {
			myName = userName;
		}
		var roomName = $('#roomName');
		roomName.html( "Chat room " + chatRoomNum);
	};


	/**
	 * This method is optional. If the server wasn't able to respond to the
	 * in 3 seconds then show some error message to notify the user that
	 * something is wrong.
	 */
	setInterval(function() {
		if (connection.readyState !== 1) {
			status.text('Error');
			content.html('Unable to communicate ' + 'with the WebSocket server.');
		}
	}, 10000);

	/**
	 * Add message to the chat window
	 */
	function addMessage(author, message, color, dt) {
		content.append('<p><span style="color:' + color + '">' + author + '</span> @ ' +
			 + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
			 + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
			 + ': ' + message + '</p>');
	}
});
