# Simple WebRTC Echo Server

Goal: Provide a benchmark and testable implementation of a WebRTC "UDP-like" server.

Tests:

- Run a benchmark comparing the echo throughput of this server versus a Node WebSocket server (powered by the `ws` module)
- Test whether symmetric NAT can connect to a non-NAT server without a TURN server

## Parts

### Benchmark

This should compare:

- WebRTC data channel with `{ordered: false, maxRetransmits: 0}` ("UDP-like")
- WebRTC data channel with default settings ("TCP-like")
- A simple websocket server

All these should simply echo back the message.

Measurements will be average RTT (not counting dropped packets) and overall throughput over some amount of time. The UDP-like channel should also measure how many packets are dropped, because why not?

### NAT Test

To figure out whether the server is working with symmetric NAT, find a network with symmetric NAT and try connecting.

- To test whether NAT is symmetric, use https://jsfiddle.net/p9af6hx3/1/show

## Building

To build the WebRTC server: