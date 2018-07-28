import DataChannel from './client.js';

const vm = new Vue({
  el: '#app',
  data: {
    pingCount: 0,
    outstandingPings: {},
  },
  // methods: {
  //   pingStyle(ping) {
  //     return this.pongs[ping] ? { fontWeight: 'bold' } : null;
  //   },
  // },
});

class PingPong {
  constructor() {
    this.nextId = 0;
  }

  ping() {
    const id = this.nextId;
    this.nextId += 1;
    vm.pingCount += 1;
    vm.outstandingPings[id] = true;
    return id;
  }

  pong(pingId) {
    delete vm.outstandingPings[pingId];
  }
}

const pingPong = new PingPong();

const channel = new DataChannel();

channel.onopen = () => {
  setInterval(() => {
    for (let i = 0; i < 10; i += 1) {
      const id = pingPong.ping();
      channel.send(`ping ${id}`);
    }
  }, 100);
};

channel.onmessage = (evt) => {
  if (typeof evt.data === 'string') {
    const [cmd, id] = evt.data.split(' ');
    if (cmd === 'pong') {
      pingPong.pong(id);
    }
  }
};

channel.connect();
