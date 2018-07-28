const http = require('http');
const wrtc = require('wrtc');
const WebSocket = require('ws');
const express = require('express');

const app = express();

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const peer = new wrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
  });

  peer.onicecandidate = ({ candidate }) => {
    if (candidate) {
      console.log('hey we got an ice candidate');
      ws.send(JSON.stringify({ type: 'candidate', candidate }));
    }
  };

  let seenPings = [];

  function getPingInfo() {
    return {
      pingsReceived: seenPings.length,
    };
  }

  peer.ondatachannel = (evt) => {
    console.log("hey there's a data channel now i guess");

    const channel = evt.channel;

    channel.onopen = () => {
      console.log("and it's open");
    };

    channel.onmessage = (evt) => {
      if (typeof evt.data === 'string') {
        const [cmd, id] = evt.data.split(' ');
        if (cmd === 'ping') {
          seenPings.push(id);
          channel.send(`pong ${id}`);
        } else if (cmd === 'getPingInfo') {
          channel.send(JSON.stringify(getPingInfo()));
        }
      }
    };
  };

  const candidateQueue = [];

  async function handleOffer(msg) {
    const offer = msg.offer;
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: 'answer', answer }));

    for (let queuedCanddiate of candidateQueue) {
      peer.addIceCandidate(queuedCandidate);
    }
  }

  async function handleCandidate(msg) {
    const candidate = new wrtc.RTCIceCandidate(msg.candidate);
    if (!peer.remoteDescription) {
      candidateQueue.push(candidate);
    } else {
      await peer.addIceCandidate(candidate);
    }
  }

  ws.on('message', (msg) => {
    try {
      msg = JSON.parse(msg);
    } catch (err) {
      ws.send(JSON.stringify({ error: 'invalid json' }));
      return;
    }

    if (msg.type === 'offer') {
      handleOffer(msg);
    } else if (msg.type === 'candidate') {
      handleCandidate(msg);
    } else {
      ws.send(JSON.stringify({ error: `unknown message type ${msg.type}` }));
      return;
    }
  });
});

app.use(express.static('client'));

server.listen(PORT, () => console.log(`listening on port ${PORT}`));
