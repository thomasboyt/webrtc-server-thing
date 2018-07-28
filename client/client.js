async function main() {
  const peer = new RTCPeerConnection({
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
  });

  peer.onicecandidate = (evt) => {
    if (evt.candidate) {
      console.log('received candidate', evt.candidate);
    }
  };

  peer.ondatachannel = (evt) => {
    console.log('peer connection on data channel');
    console.log(evt);
  };

  const channel = peer.createDataChannel('channel', {
    ordered: false,
    maxRetransmits: 0,
  });

  channel.binaryType = 'arraybuffer';

  channel.onopen = function() {
    console.log('data channel ready');
    socket.open = true;
    if (typeof socket.onopen == 'function') {
      socket.onopen();
    }
  };

  channel.onclose = function() {
    this.open = false;
    console.log('data channel closed');
  };

  channel.onerror = function(evt) {
    console.log('data channel error ' + evt.message);
  };

  channel.onmessage = function(evt) {
    if (typeof socket.onmessage == 'function') {
      socket.onmessage(evt);
    }
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  // console.log('sending offer');
  // const resp = await fetch('/connect', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     offer,
  //   }),
  // });

  // if (resp.status !== 200) {
  //   throw new Error(resp);
  // }

  // const body = await resp.json();

  // console.log('setting description');
  // await peer.setRemoteDescription(new RTCSessionDescription(body.answer));

  // console.log('adding ice candidate');
  // let candidate = new RTCIceCandidate(body.candidate);
  // await peer.addIceCandidate(candidate);
  // console.log('add ice candidate success');
}

main();
