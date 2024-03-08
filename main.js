let APP_ID = "124d08d7f4b144c69aa94513c413fa4f"

let token=null;
let uid= String(Math.floor(Math.random() * 10000)); //a unique identification id generator(can also use the uid() function availabble in npm)

let client; 
let channel; //channel that two users join

let querystring= window.location.search; //This line retrieves the query string part of the URL currently loaded in the browser's window and assigns it to the variable querystring. The query string is everything after the ? in the URL.
let urlparams=new URLSearchParams(querystring); // When you have a URL with a query string (the part of a URL that comes after the ?), the URLSearchParams object can parse this string and create a new object representing the parameters and their values.This line creates a new URLSearchParams object named urlparams, using the querystring obtained from the URL. URLSearchParams is a built-in object that provides an easy way to access and manipulate URL query parameters.
let roomid= urlparams.get('room'); //  This line retrieves the value of the room parameter from the urlparams object and assigns it to the variable roomid. The get() method of URLSearchParams retrieves the first value associated with the given search parameter (in this case, room).

if(!roomid){
    window.location = 'lobby.html' ;
}

let localstream;
let remotestream;
let peerconnection;

const servers = {
    iceServer:[
        {
            urls:['stun:stun.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }   //using google stun servers for the connections
    ]
} 

let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080}
    },
    audio:true
} // setting the constraints for the video to adjust the height and width

let init= async()=>{
    client = await AgoraRTM.createInstance(APP_ID); //creating an instance using the APP_ID OR Creates an RtmClient instance.

    await client.login({uid, token});//	Logs in to the Agora RTM system.

    //index.html?room=234234
    channel= client.createChannel(roomid)  //Creates an RtmChannel instance. roomid the name of the channel or the id of the channel
    await channel.join(); //Joins the channel.

    channel.on('MemberJoined', handleUserJoined); //	Occurs when a remote user joins the channel.
    channel.on('MemberLeft', handleUserLeft); //occurs when a user leaves

    client.on("MessageFromPeer", handleMessageFromPeer); //Occurs when receiving a peer-to-peer message.

    localstream=await navigator.mediaDevices.getUserMedia({video:true, audio:true}); //asking for permissions to turn on audio and video
    document.getElementById('user-1').srcObject= localstream; //setting the source object aligned with the permissions and setting the steam....established for the person starting the conversation

}

let handleUserJoined= async(memberId)=>{
    console.log("A NEW USER JOINED:", memberId); //displays the memberid of the joined user
    createoffer(memberId);
}

let handleUserLeft= async(memberId) => {
    document.getElementById('user-2').style.display= "none";
    document.getElementById("user-1").classList.remove("smallframe");
}

let handleMessageFromPeer= async(message, memberId)=> {
    message= JSON.parse(message.text);
    if(message.type === 'offer'){
        createanswer(memberId, message.offer);
    }  //if the message is an offer 

    if(message.type === 'answer'){
        addanswer(message.answer);
    }  //if the message is an answer

    if(message.type === 'candidate'){
        if(peerconnection){
            peerconnection.addIceCandidate(message.candidate); //adding the ice candidates to the peerconnection...addIceCandidate() Function: Once a peer receives ICE candidates from the other peer, it adds them to its peer connection using the addIceCandidate() function. This function takes an ICE candidate object as its parameter.
        } // if message is a icecandidate
    } 
}

let createpeerconnection= async(memberId) => {
    peerconnection=new RTCPeerConnection(servers);//An interface to configure video chat or voice calls.

    remotestream= new MediaStream(); //sets a media stream
    document.getElementById('user-2').srcObject= remotestream; //establising the stream for thr user2, the person invited
    document.getElementById('user-2').style.display = 'block';

    document.getElementById('user-1').classList.add('smallframe'); //when a user joins my video will be in a small frame
    
    if(!localstream){
        localstream=await navigator.mediaDevices.getUserMedia({video:true, audio:true}); 
        document.getElementById('user-1').srcObject= localstream; // an extra check
    }

    localstream.getTracks().forEach((track)=>{
        peerconnection.addTrack(track, localstream);
    }); //adding the tracks to the peerconnection

    peerconnection.ontrack= (event) => {
        event.streams[0].getTracks().forEach((track)=> {
            remotestream.addTrack(track);
        })
    }

    peerconnection.onicecandidate= async(event) =>{
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, memberId); //sending ice candidates to the peer
        }
    } //setLocalDescription will turn this on..and ice candidates will be sent

}  //function to create the peer connection 


let createoffer=async(memberId)=>{
    await createpeerconnection(memberId);

    let offer=await peerconnection.createOffer();//creating a offer(O is in capital)
    await peerconnection.setLocalDescription(offer);
    //for pier1 (the person sending the offer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer', 'offer':offer})}, memberId); //	Sends a peer-to-peer message to a specified user
}

let createanswer= async(memberId, offer) => {
    await createpeerconnection(memberId);

    await peerconnection.setRemoteDescription(offer);
    //Once the callee receives the offer from the caller, it uses the setRemoteDescription() method to apply the received offer. Similarly, once the caller receives the answer from the callee, it uses setRemoteDescription() to apply the answer. //for peer2(the person receiving the offer)

    let answer= await peerconnection.createAnswer();
    await peerconnection.setLocalDescription(answer);
    //for pier2 (the person receiving the offer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, memberId); //	Sends a peer-to-peer message to a specified user
}

let addanswer= async(answer) => {
    if(!peerconnection.currentRemoteDescription){
        peerconnection.setRemoteDescription(answer); // After both peers have applied the remote description using setRemoteDescription(), they proceed with other steps, such as gathering ICE (Interactive Connectivity Establishment) candidates and exchanging them, to establish the actual media communication. //for peer1(the person receiving the answer or sending the offer)
    }
}


let togglecamera= async()=>{
    let videotrack = localstream.getTracks().find(track => track.kind === 'video');

    if(videotrack.enabled == true){
        videotrack.enabled=false;
        document.getElementById('camera-btn').style.backgroundColor= 'rgb(255,80,80)'
    }
    else{
        videotrack.enabled=true;
        document.getElementById('camera-btn').style.backgroundColor= 'rgb(179, 102, 249, 0.9)'
    } //localstream.getTracks(): This method is used to retrieve an array of all the tracks (audio and video) contained within the localstream MediaStream object.  .find(track => track.kind === 'video'): This part of the code uses the find() method to search for the first track in the array of tracks that has a kind property equal to 'video'. The track parameter inside the arrow function represents each individual track being iterated over. This part of the code essentially selects the first video track found in the localstream MediaStream object. videotrack: If a video track is found (i.e., videotrack is not undefined), it is assigned to the variable videotrack. If no video track is found, videotrack will be undefined. if(videotrack.enabled): This condition checks if the enabled property of the videotrack is true. The enabled property indicates whether the track is enabled for streaming or not. If the video track is currently enabled, the condition evaluates to true. videotrack.enabled = false;: If the condition is true (i.e., if the video track is currently enabled), this statement sets the enabled property of the videotrack to false. This effectively disables the video track, preventing it from sending video data.
}

let togglemic= async()=>{
    let audiotrack = localstream.getTracks().find(track => track.kind === 'audio');

    if(audiotrack.enabled == true){
        audiotrack.enabled=false;
        document.getElementById('mic-btn').style.backgroundColor= 'rgb(255,80,80)'
    }
    else{
        audiotrack.enabled=true;
        document.getElementById('mic-btn').style.backgroundColor= 'rgb(179, 102, 249, 0.9)'
    } //same for audio as video
}

let leavechannel= async() => {
    await channel.leave(); //	Leaves the channel.
    await client.logout(); //Logs out of the Agora RTM system.
}

window.addEventListener("beforeunload", leavechannel); // The beforeunload event is a part of the WindowEventHandlers interface in the DOM (Document Object Model) API. It is triggered when a webpage or document is about to be unloaded, either by navigating to another page, refreshing the current page, or closing the browser tab/window.


document.getElementById('camera-btn').addEventListener("click", togglecamera);

document.getElementById('mic-btn').addEventListener("click", togglemic)

init();