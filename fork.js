/**
* @ wenvtcfork.xyz
**/

var forkHeight = 1500000;
var interval;
var latestBlock = false;

$(document).ready(function() {
	$('#forkHeight').html(forkHeight.toLocaleString());
  if( !("WebSocket" in window) ) {
		// fail
	} else {
    connect();
  }
});

var ws;
var host = "wss://vtc1.trezor.io/websocket";

var messageID = 0;
var pendingMessages = {};
var subscriptions = {};

function connect(){
	try{
		ws = new WebSocket(host);
		ws.onopen = function(){ start(); getInfo(); }
		ws.onmessage = function(e){
			var resp = JSON.parse(e.data);
			var f = pendingMessages[resp.id];
			if (f != undefined) {
					delete pendingMessages[resp.id];
					f(resp.data);
			} else {
					f = subscriptions[resp.id];
					if (f != undefined) {
							f(resp.data);
					} else {
						// unknown response
					}
			}
		}

		ws.onclose = function(){ stop(); }			

	} catch(exception){
		console.error(exception)
	}
};

function start () {
	interval = setInterval( routine, 1000 );
}

function stop () {
	clearInterval( interval );
}

function getInfo () {
	subscribe('subscribeNewBlock', {}, (res) => {
		if( 'height' in res ) {
			latestBlock = res.height;
		}
	});

	send('getInfo', {}, (res) => {
		if( 'bestHeight' in res ) {
			latestBlock = res.bestHeight;
			processETA();
		}
	})
}

function processETA () {
	if( ! latestBlock ) return false;

	$('#currentBlock').html(latestBlock.toLocaleString());

	if( latestBlock >= forkHeight) {
		$('#eta').hide();
		$('#success').show();
	} else {
		// Remaining Blocks..
		let remainingBlocks = forkHeight - latestBlock;
		$('#remainingBlocks').html(remainingBlocks.toLocaleString());
		// Remaining Time
		let remainingMinutes = remainingBlocks * 2.5;
		let remainingHours = remainingMinutes / 60;
		let remainingDays = Math.floor(remainingHours / 24);
		remainingHours = Math.floor( remainingHours - (remainingDays * 24) );
		remainingMinutes = remainingMinutes - (Math.floor(remainingMinutes / 60) * 60); 
		let remainingSeconds = ( remainingMinutes % 1 > 0 ) ? 30 : 0;
		remainingMinutes = Math.floor(remainingMinutes);
		let remainingString = ( remainingDays > 0 ) ? `${remainingDays}d ` : '';
		remainingString += ( remainingHours > 0 ) ? `${remainingHours}h ` : '';
		remainingString += ( remainingMinutes > 0 ) ? `${remainingMinutes}m ` : '';
		remainingString += ( remainingSeconds > 0 ) ? `${remainingSeconds}s` : '';
		$('#remainingTime').html(remainingString);

		// Fork Time..
		let now = Date.now();
		let forkMSeconds = now + ( remainingBlocks * 150 * 1000 );
		let forkDate = new Date(forkMSeconds);

		$('#verthashETA').html(forkDate);
	}
} 

function routine () {
	// Ping
	send( 'ping', {}, () => { return; } );
	processETA();
}

function send(method, params, callback) {
	var id = messageID.toString();
	messageID++;
	pendingMessages[id] = callback;
	var req = {
			id,
			method,
			params
	}
	ws.send(JSON.stringify(req));
	return id;
}

function subscribe(method, params, callback) {
	var id = messageID.toString();
	messageID++;
	subscriptions[id] = callback;
	var req = {
			id,
			method,
			params
	}
	ws.send(JSON.stringify(req));
	return id;
}