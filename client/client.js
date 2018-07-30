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

    this.channels = {};
    this._createChannel('reliable');
    this._createChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });
  }

  async getConnectionProtocol() {
    const stats = await this._peer.getStats();
    const connectionPairs = [...stats.values()].filter(
      (entry) => entry.type === 'candidate-pair'
    );
    const successPairs = connectionPairs.filter(
      (entry) => entry.state === 'succeeded'
    );

    if (successPairs.length !== 1) {
      console.log('too many or too few success pairs');
      console.log(connectionPairs);
      console.log([...stats.values()]);
      throw new Error();
    }

    const pair = connectionPairs[0];
    const remote = stats.get(pair.remoteCandidateId);

    return remote.protocol;
  }

  async connect() {
    const offer = await this._peer.createOffer();
    await this._peer.setLocalDescription(offer);
    this._createWebSocket(offer);
  }

  _createChannel(name, config) {
    const channel = this._peer.createDataChannel('channel', config);

    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('data channel ready');
      this.channels[name].onopen();
    };

    channel.onclose = () => {
      console.log('data channel closed');
    };

    channel.onerror = (evt) => {
      console.log('data channel error ' + evt.message);
    };

    channel.onmessage = (evt) => {
      this.channels[name].onmessage(evt);
    };

    this.channels[name] = {
      send: (msg) => {
        channel.send(msg);
      },
      onopen: () => {},
      onmessage: (msg) => {},
    };
  }

  _createWebSocket(offer) {
    const ws = new WebSocket(`ws://${document.location.host}`);
    this._ws = ws;

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
