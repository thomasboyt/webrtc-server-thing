class PingPong {
  constructor() {
    this.pingCount = 0;
    this.pongCount = 0;
    this._outstandingPings = new Set();
  }

  ping() {
    const id = this.pingCount;
    this._outstandingPings.add(id);
    this.pingCount += 1;
    return id;
  }

  pong(id) {
    this._outstandingPings.delete(id);
    this.pongCount += 1;
  }
}

const pingPong = new PingPong();

function createChannel(peer) {
  const channel = peer.createDataChannel('channel', {
    ordered: false,
    maxRetransmits: 0,
  });
  channel.binaryType = 'arraybuffer';

  channel.onopen = function() {
    console.log('data channel ready');

    setInterval(() => {
      for (let i = 0; i < 10; i += 1) {
        const id = pingPong.ping();
        channel.send(`ping ${id}`);
      }
    }, 100);
  };

  channel.onclose = function() {
    console.log('data channel closed');
  };

  channel.onerror = function(evt) {
    console.log('data channel error ' + evt.message);
  };

  channel.onmessage = function(evt) {
    if (typeof evt.data === 'string') {
      const [cmd, id] = evt.data.split(' ');
      if (cmd === 'pong') {
        pingPong.pong(id);
        console.log('pong', id);
      }
    }
  };
}

async function main() {
  const peer = new RTCPeerConnection({
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
  });

  createChannel(peer);

  const pendingCandidates = [];

  peer.onicecandidate = (evt) => {
    if (evt.candidate) {
      pendingCandidates.push(evt.candidate);
    }
  };

  async function handleAnswer(msg) {
    await peer.setRemoteDescription(new RTCSessionDescription(msg.answer));
  }

  async function handleCandidate(msg) {
    const candidate = new RTCIceCandidate(msg.candidate);
    await peer.addIceCandidate(candidate);
  }

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  const ws = new WebSocket(`ws://${document.location.host}`);

  ws.onopen = () => {
    console.log('opened socket');

    ws.send(JSON.stringify({ type: 'offer', offer }));

    for (let candidate of pendingCandidates) {
      ws.send(JSON.stringify({ type: 'candidate', candidate }));
    }
  };

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);

    if (msg.error) {
      throw new Error(`ws error: ${msg.error}`);
    }

    if (msg.type === 'answer') {
      handleAnswer(msg);
    } else if (msg.type === 'candidate') {
      handleCandidate(msg);
    } else {
      throw new Error(`unrecognized ws message type ${msg.type}`);
    }
  };
}

main();
