import DataChannel from './client.js';

const vm = new Vue({
  el: '#app',
  data: {
    pingCount: 0,
    outstandingPings: {},
    protocol: null,
  },
});

let nextPingId = 0;
const ping = () => {
  const id = nextPingId;
  nextPingId += 1;
  vm.pingCount += 1;
  vm.outstandingPings[id] = true;
  return id;
};

const pong = (id) => {
  delete vm.outstandingPings[id];
};

const setProtocol = (protocol) => {
  vm.protocol = protocol.toUpperCase();
};

const channel = new DataChannel();

channel.onopen = async () => {
  setInterval(() => {
    for (let i = 0; i < 10; i += 1) {
      const id = ping();
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
