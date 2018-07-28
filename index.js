const wrtc = require('wrtc');
const asyncHandler = require('./asyncHandler');

const HOST = '127.0.0.1';
const PORT = 3000;

const peer = new wrtc.RTCPeerConnection({
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302'],
    },
  ],
});

const dc = peer.createDataChannel('channel');

dc.onopen = () => {};

const express = require('express');

const app = express();

app.use(express.json());

app.post(
  '/connect',
  asyncHandler(async (req, res) => {
    const offer = req.body.offer;
    if (!offer) {
      return res.status(400).send('Missing `offer` in request body');
    }

    const sdp = offer.sdp;
    const candidate = offer.candidate;

    await peer.setRemoteDescription(
      new wrtc.RTCSessionDescription({ type: 'offer', sdp })
    );

    const candidates = [];

    peer.onicecandidate = (evt) => {
      console.log('ice candidate');
      console.log(evt.candidate);
      candidates.push(evt.candidate);
    };

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    // XXX: dumb hack
    // const candidate = new wrtc.RTCIceCandidate(candidates[1]);

    // const candidate =
    // "candidate\":{\"sdpMLineIndex\":0,"
    // '"sdpMid":"%.*s","candidate":"candidate:1 1 UDP %u %s %u typ ';
    // "host\"}}",
    // const candidate = {
    //   sdpMLineIndex: 0,
    //   sdpMid: 'data', // TODO: wat
    //   candidate: 'candidate:1 1 UDP 1234 ',
    // };

    // console.log(answer);
    // console.log(peer.localDescription);
    // peer.addIceCandidate();
    res.json({
      answer: peer.localDescription,
      // candidate: event.candidate.candidate,
      // sdpMLineIndex: event.candidate.sdpMLineIndex,
      // sdpMid: event.candidate.sdpMid,
    });
  })
);

app.use(express.static('client'));

app.listen(3000, () => console.log('listening on port 3000'));
