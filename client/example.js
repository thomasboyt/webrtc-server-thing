import DataConnection from './client.js';

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const squareSize = 10;
// const maxPackets = (canvas.width / squareSize) * (canvas.height / squareSize);
const maxPackets = 100;
const summaryTimeout = 100;

const vm = new Vue({
  el: '#app',
  data: {
    pingCount: 0,
    pongCount: 0,
    pingsReceived: null,
    protocol: null,
    maxPackets,
    outOfOrderCount: 0,
    latencies: [],
  },

  computed: {
    latencySummary() {
      const latencies = this.latencies;
      latencies.sort((a, b) => b - a);
      const high = latencies[0];
      // not sure if this is the actual median
      const median = latencies[Math.floor(latencies.length / 2)];
      const mean = latencies.reduce((acc, n) => acc + n, 0) / latencies.length;
      return `Median: ${median} / Mean: ${mean} / High: ${high}`;
    },
  },
});

const pingTimes = {};

function updateNode(idx, style) {
  ctx.fillStyle = style;
  let x = idx % (canvas.width / squareSize);
  let y = Math.floor(idx / (canvas.width / squareSize));
  ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
}

let nextPingId = 0;
let lastPong = -1;
const ping = () => {
  const id = nextPingId;
  nextPingId += 1;
  vm.pingCount += 1;
  updateNode(id, 'red');
  pingTimes[id] = Date.now();
  return id;
};

const pong = (id) => {
  vm.pongCount += 1;
  if (pong < lastPong) {
    vm.outOfOrderCount += 1;
  }
  lastPong = pong;
  vm.latencies.push(Date.now() - pingTimes[id]);
  updateNode(id, 'green');
};

const setProtocol = (protocol) => {
  vm.protocol = protocol.toUpperCase();
};

const co = new DataConnection();

co.channels.unreliable.onopen = async () => {
  let interval = setInterval(() => {
    for (let i = 0; i < 10; i += 1) {
      if (nextPingId >= maxPackets) {
        clearInterval(interval);
        setTimeout(() => {
          co.channels.reliable.send('getPingInfo');
        }, summaryTimeout);
        return;
      }
      const id = ping();
      co.channels.unreliable.send(`ping ${id}`);
    }
  }, 100);

  const protocol = await co.getConnectionProtocol();
  setProtocol(protocol);
};

co.channels.unreliable.onmessage = (evt) => {
  if (typeof evt.data === 'string') {
    const [cmd, id] = evt.data.split(' ');
    if (cmd === 'pong') {
      pong(parseInt(id));
    }
  }
};

co.channels.reliable.onmessage = (evt) => {
  if (typeof evt.data === 'string') {
    const msg = JSON.parse(evt.data);
    vm.pingsReceived = msg.pingsReceived;
  }
};

co.connect();
