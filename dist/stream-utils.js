"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectStream = exports.createReadableStreamFromArray = exports.createReadableStreamFromString = void 0;
const node_stream_1 = require("node:stream");
function createReadableStreamFromString(str, chunkSize = 10) {
    let start = 0;
    return new node_stream_1.Readable({
        read() {
            if (start >= str.length) {
                this.push(null);
            }
            else {
                this.push(str.slice(start, start + chunkSize), 'utf8');
                start += chunkSize;
            }
        },
    });
}
exports.createReadableStreamFromString = createReadableStreamFromString;
function createReadableStreamFromArray(arr) {
    let index = 0;
    return new node_stream_1.Readable({
        objectMode: true,
        read() {
            if (index >= arr.length) {
                this.push(null);
            }
            else {
                this.push(arr[index], 'utf8');
                index++;
            }
        },
    });
}
exports.createReadableStreamFromArray = createReadableStreamFromArray;
function collectStream(stream, objectMode = true) {
    const output = [];
    const collectStream = new node_stream_1.Writable({
        objectMode,
        write(chunk, _, done) {
            output.push(chunk);
            done();
        },
    });
    return new Promise((resolve, reject) => (0, node_stream_1.pipeline)(stream, collectStream, (err) => (err ? reject(err) : resolve(output))));
}
exports.collectStream = collectStream;
//# sourceMappingURL=stream-utils.js.map