import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState,useRef } from 'react';
import ReactDOM from 'react-dom';

const w= new WebSocket("wss://signalaara.herokuapp.com/ws");

function App() {

  console.log(
    "renderingggg..........................................................................."
  );
  const [localStream, setLocalStream] = useState({ toURL: () => null });
  const [remoteStream, setRemoteStream] = useState({ toURL: () => null });
  const lVideo=useRef(null)
  const rVideo=useRef(null)
  const [pc, setPC] = useState(
    new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        {
          urls: "stun:stun1.l.google.com:19302",
        },
        {
          urls: "stun:stun2.l.google.com:19302",
        },
      ],
    })
  );
  const [ws, setWS] = useState(w)


  
  // const [ws, setWS] = useState(() => {
  //   return new WebSocket("ws://192.168.1.4:8000/ws");
  // });

  // const [ws1, setWS1] = useState(new WebSocket("ws://192.168.1.3:8000/ws"));

  useEffect(async () => {
  
    let act = 1;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Got candidate");
        console.log(event);
        ws.send(
          JSON.stringify({
            type: "new-ice-candidate",
            candidate: event.candidate,
          })
        );
      }
    };
    pc.onaddstream = event => {
      console.log('On Add Stream', event);
      //setRemoteStream(event.stream);
      rVideo.current.srcObject=event.stream
        rVideo.current.play()
        console.log(rVideo)
    };
    const getUserMedia = async () => {
      
      await navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: true,
        })
        .then(async (stream) => {
          setLocalStream(stream);
          pc.addStream(stream);
          lVideo.current.srcObject=stream
          lVideo.current.play()
          console.log(lVideo)
          console.log("Got stream",new MediaStream(stream));
          act += 1;
        });
    };

    const createRTCOffer = async () => {
      await pc.createOffer().then(async (desc) => {
        await pc.setLocalDescription(desc).then(() => {
          console.log("sending offer");
          ws.send(JSON.stringify(desc)); //sending sdp offer to server
        });
      });
    };

    const handleRTCOffer = async (desc) =>{
      await pc.setRemoteDescription(new RTCSessionDescription(desc));
      await createRTCAnswer();
    }

    const handleRTCAnswer = async (desc) =>{
      await pc.setRemoteDescription(new RTCSessionDescription(desc))
    }

    const createRTCAnswer = async () => {
      await pc.createAnswer().then(async (desc) => {
        await pc.setLocalDescription(desc).then(() => {
          console.log("sending answer");
          ws.send(JSON.stringify(desc)); //sending sdp answer to server
        });
      });
    };

    const addRTCIceCandidate = async (candidate) => {
      // console.log("hehehe ice",candidate)
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const addToPool = () => {
      ws.send(
        JSON.stringify({
          type: "add_to_pool",
        })
      );
    };

    const findMatch = () => {
      ws.send(
        JSON.stringify({
          type: "find_match",
        })
      );
    };
    await getUserMedia();
    // await getWS();
    

    ws.onopen = (event) => {
      console.log("web socket connected");
      console.log(event);
      addToPool(); //add user to pool of waiting users
      findMatch(); //request for a pair to connect
    };

    ws.onmessage = async (event) => {
      console.log("Message on ws");
      console.log(event);
      const message = JSON.parse(event.data);
      switch (message.type) {
        case "match":
          if (message.action === "offer") {
            await createRTCOffer();
          } else if (message.action === "answer") {
            //await createRTCAnswer();
            console.log("waiting for offer");
          }
          break;
        case "offer":
          //handle offer
          await handleRTCOffer(message);
          break;
        case "answer":
          //handle answer
          await handleRTCAnswer(message)
          break;

        case "new-ice-candidate":
          await addRTCIceCandidate(message.candidate);
          break;
      }
    };

    ws.onerror = (event) => {
      console.log("Error on ws");
      console.log(event);
    };
  }, []);

  return (
    <div className="App">
      <h1>AARA Chat</h1>
      <video className='local' ref={lVideo}></video>
      <video className='remote' ref={rVideo}></video>
    </div>
  );
}

export default App;
