// Loaded into the e2e server with --import. Any socket to a non-loopback
// address is refused and written to OUTBOUND_LOG, so a test can prove the
// no-keys climb made no outbound calls (parity row 12).
import { appendFileSync, writeFileSync } from "node:fs";
import net from "node:net";

const log = process.env.OUTBOUND_LOG;
if (!log) throw new Error("no-outbound.mjs needs OUTBOUND_LOG");
writeFileSync(log, "");

const LOCAL = new Set(["127.0.0.1", "::1", "localhost", "0.0.0.0"]);
const connect = net.Socket.prototype.connect;

net.Socket.prototype.connect = function (...args) {
  // net.connect() passes its normalised arguments as one array.
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options =
    typeof first === "object" && first !== null
      ? first
      : { port: first, host: args[1] };
  const host = options.host ?? "localhost";
  if (!options.path && !LOCAL.has(host)) {
    appendFileSync(log, `${host}:${options.port}\n`);
    process.nextTick(() =>
      this.destroy(new Error(`Outbound connection to ${host} blocked in e2e`)),
    );
    return this;
  }
  return connect.apply(this, args);
};
