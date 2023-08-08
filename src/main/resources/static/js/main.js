ws = new WebSocket("ws://localhost:8443/room")
// send a message to the server
function sendMessage(payload) {
    ws.send(JSON.stringify(payload));
}
const peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'}
    ]
};
ws.onmessage = processWsMessage
var connections = {};

// JavaScript variables holding stream and connection information
var localStream, localPeerConnection, remotePeerConnection;
// JavaScript variables associated with HTML5 video elements in the page
var localVideo = document.getElementById('selfView');
var remoteVideo = document.getElementById('remoteView')

function successCallback(stream) {
    log("Received local stream");
    // Associate the local video element with the retrieved stream
    localVideo.srcObject = stream;

    localStream = stream;
}
function init(){
    navigator.getUserMedia({audio: true, video: true}, successCallback,
        function (error) {
            log("navigator.getUserMedia error: ", error);
        });


}


function processWsMessage(message) {
    var signal = JSON.parse(message.data);
    console.log(message)
    // you have logged in
    switch (signal.type) {
        case 'init':
            handleInit(signal);
            break;
        case 'logout':
            handleLogout(signal);
            break;
        case 'offer':
            handleOffer(signal);
            break;
        case 'answer':
            handleAnswer(signal);
            break;
        case 'ice':
            handleIce(signal);
            break;
    }
}
// function handleInit(signal) {
//     var peerId = signal.sender;
//     // var connection = new RTC
//     var connection = getRTCPeerConnectionObject(peerId);
//
//     // make an offer, and send the SDP to sender.
//     connection.createOffer().then(function (sdp) {
//         connection.setLocalDescription(sdp);
//         console.log('Creating an offer for', peerId);
//         sendMessage({
//             type: "offer",
//             receiver: peerId,
//             data: sdp
//         });
//     }).catch(function (e) {
//         console.log('Error in offer creation.', e);
//     });
//
// }
function getRTCPeerConnectionObject(uuid) {

    if (connections[uuid]) {
        return connections[uuid];
    }

    var connection = new RTCPeerConnection(peerConnectionConfig);

    connection.addStream(localStream);

    // handle on ice candidate
    connection.onicecandidate = function (event) {
        console.log("candidate is: " + event.candidate);
        if (event.candidate) {
            sendMessage({
                type: "ice",
                receiver: uuid,
                data: event.candidate
            });
        }
    };

    connections[uuid] = connection;
    return connection;
}

function handleInit(signal){
    var peerId=signal.sender
    log("RTCPeerConnection object: " + RTCPeerConnection);
    localPeerConnection = new RTCPeerConnection(peerConnectionConfig);
    log("Created local peer connection object localPeerConnection");
    // Add a handler associated with ICE protocol events
    localPeerConnection.onicecandidate = gotLocalIceCandidate;
    // Create the remote PeerConnection object
    remotePeerConnection = new RTCPeerConnection(peerConnectionConfig);
    log("Created remote peer connection object remotePeerConnection");

// Add a handler associated with ICE protocol events...
    remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
    // ...and a second handler to be activated as soon as the remote
    // stream becomes available.
    remotePeerConnection.onaddstream = gotRemoteStream;
    // Add the local stream (as returned by getUserMedia())
    // to the local PeerConnection.
    localPeerConnection.addStream(localStream);
    log("Added localStream to localPeerConnection");
    // We're all set! Create an Offer to be 'sent' to the callee as soon
    // as the local SDP is ready.
    localPeerConnection.createOffer(gotLocalDescription, onSignalingError);
}
// Handler to be called when the 'local' SDP becomes available
function gotLocalDescription(description){
    // Add the local description to the local PeerConnection
    localPeerConnection.setLocalDescription(description);
    log("Offer from localPeerConnection: \n" + description.sdp);
    // ...do the same with the 'pseudoremote' PeerConnection
    // Note: this is the part that will have to be changed if
    // you want the communicating peers to become remote
    // (which calls for the setup of a proper signaling channel)
    remotePeerConnection.setRemoteDescription(description);
    // Create the Answer to the received Offer based on the 'local' description
    remotePeerConnection.createAnswer(gotRemoteDescription,onSignalingError);
}
// Handler to be called when the remote SDP becomes available
function gotRemoteDescription(description){
    // Set the remote description as the local description of the
    // remote PeerConnection
    remotePeerConnection.setLocalDescription(description);
    log("Answer from remotePeerConnection: \n" + description.sdp);
    // Conversely, set the remote description as the remote description
    // of the local PeerConnection
    localPeerConnection.setRemoteDescription(description);
}
function onSignalingError(error) {
    console.log('Failed to create signaling message : ' + error.name);
}

window.onload=init
function log(text) {
    console.log("At time: " + (performance.now() / 1000).toFixed(3) + " --> "+text)

}
function gotLocalIceCandidate(event){
    if (event.candidate) {
        // Add candidate to the remote PeerConnection
        remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        log("Local ICE candidate: \n" + event.candidate.candidate);
    }
}
function gotRemoteStream(event){
    // Associate the remote video element with the retrieved stream
    if (window.URL) {
        // Chrome
        remoteVideo.srcObject = event.stream;
    } else {
        // Firefox
        remoteVideo.srcObject = event.stream;
    }
    log("Received remote stream");
}
// Handler to be called whenever a new remote ICE candidate becomes available
function gotRemoteIceCandidate(event) {
    if (event.candidate) {
        // Add candidate to the local PeerConnection
        localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        log("Remote ICE candidate: \n " + event.candidate.candidate);
    }
}
