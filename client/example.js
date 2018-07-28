import DataChannel from './client.js';

const vm = new Vue({
  el: '#app',
  data: {
    pingCount: 0,
    protocol: null,
  },
});

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const squareSize = 10;
const maxPackets = (canvas.width / squareSize) * (canvas.height / squareSize);

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

const channel = new DataChannel();

channel.onopen = async () => {
  let interval = setInterval(() => {
    for (let i = 0; i < 10; i += 1) {
      const id = ping();
      if (id >= maxPackets - 1) {
        clearInterval(interval);
        return;
      }
      channel.send(`ping ${id}`);
    }
  }, 100);

  const protocol = await channel.getConnectionProtocol();
  setProtocol(protocol);
};

channel.onmessage = (evt) => {
  if (typeof evt.data === 'string') {
    const [cmd, id] = evt.data.split(' ');
    if (cmd === 'pong') {
      pong(id);
    }
  }
};

channel.connect();
