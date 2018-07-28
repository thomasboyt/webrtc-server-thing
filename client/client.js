export default class DataConnection {
  constructor() {
    this._pendingCandidates = [];

    this._peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
      ],
    });

    this._peer.onicecandidate = (evt) => {
      if (evt.candidate) {
        this._pendingCandidates.push(evt.candidate);
      }
    };

    this._createChannel();
  }

  async connect() {
    const offer = await this._peer.createOffer();
    await this._peer.setLocalDescription(offer);
    this._createWebSocket(offer);
  }

  send(msg) {
    this._channel.send(msg);
  }

  _createChannel() {
    const channel = this._peer.createDataChannel('channel', {
      ordered: false,
      maxRetransmits: 0,
    });
    this._channel = channel;

    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('data channel ready');
      if (this.onopen) {
        this.onopen();
      }
    };

    channel.onclose = () => {
      console.log('data channel closed');
    };

    channel.onerror = (evt) => {
      console.log('data channel error ' + evt.message);
    };

    channel.onmessage = (evt) => {
      if (this.onmessage) {
        this.onmessage(evt);
      }
    };
  }

  _createWebSocket(offer) {
    const ws = new WebSocket(`ws://${document.location.host}`);

    ws.onopen = () => {
      console.log('opened socket');

      ws.send(JSON.stringify({ type: 'offer', offer }));

      for (let candidate of this._pendingCandidates) {
        ws.send(JSON.stringify({ type: 'candidate', candidate }));
      }
    };

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);

      if (msg.error) {
        throw new Error(`ws error: ${msg.error}`);
      }

      if (msg.type === 'answer') {
        this._handleAnswer(msg);
      } else if (msg.type === 'candidate') {
        this._handleCandidate(msg);
      } else {
        throw new Error(`unrecognized ws message type ${msg.type}`);
      }
    };
  }

  async _handleAnswer(msg) {
    await this._peer.setRemoteDescription(
      new RTCSessionDescription(msg.answer)
    );
  }

  async _handleCandidate(msg) {
    const candidate = new RTCIceCandidate(msg.candidate);
    await this._peer.addIceCandidate(candidate);
  }
}
