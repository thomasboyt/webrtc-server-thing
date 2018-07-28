async function main() {
  const peer = new RTCPeerConnection({
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
  });

  const pendingCandidates = [];

  peer.onicecandidate = (evt) => {
    if (evt.candidate) {
      console.log('on ice candidate');
      pendingCandidates.push(evt.candidate);
    }
  };

  peer.ondatachannel = (evt) => {
    console.log('peer connection on data channel');
    console.log(evt.channel);
  };

  const channel = peer.createDataChannel('channel', {
    // ordered: false,
    // maxRetransmits: 0,
  });
  channel.binaryType = 'arraybuffer';

  channel.onopen = function() {
    console.log('data channel ready');

    setInterval(() => {
      channel.send('ping');
    }, 1000);
  };

  channel.onclose = function() {
    console.log('data channel closed');
  };

  channel.onerror = function(evt) {
    console.log('data channel error ' + evt.message);
  };

  channel.onmessage = function(evt) {
    if (evt.data === 'pong') {
      console.log('* pong');
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
