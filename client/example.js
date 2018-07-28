import DataConnection from './client.js';

const vm = new Vue({
  el: '#app',
  data: {
    pingCount: 0,
    pingsReceived: null,
    protocol: null,
  },
});

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const squareSize = 10;
// const maxPackets = (canvas.width / squareSize) * (canvas.height / squareSize);
const maxPackets = 100;

function updateNode(idx, style) {
  ctx.fillStyle = style;
  let x = idx % (canvas.width / squareSize);
  let y = Math.floor(idx / (canvas.width / squareSize));
  ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
}

let nextPingId = 0;
const ping = () => {
  const id = nextPingId;
  nextPingId += 1;
  vm.pingCount += 1;
  updateNode(id, 'red');
  return id;
};

const pong = (id) => {
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
        }, 3000);
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
      pong(id);
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
