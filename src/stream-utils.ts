import { Readable, Transform, Writable, pipeline } from 'node:stream';

export function createReadableStreamFromString(str: string, chunkSize = 10): Readable {
  let start = 0;
  return new Readable({
    read() {
      if (start >= str.length) {
        this.push(null);
      } else {
        this.push(str.slice(start, start + chunkSize), 'utf8');
        start += chunkSize;
      }
    },
  });
}

export function createReadableStreamFromArray(arr: any[]): Readable {
  let index = 0;
  return new Readable({
    objectMode: true,
    read() {
      if (index >= arr.length) {
        this.push(null);
      } else {
        this.push(arr[index], 'utf8');
        index++;
      }
    },
  });
}

export function collectStream(stream: Transform | Readable, objectMode = true): Promise<any[]> {
  const output: any[] = [];
  const collectStream = new Writable({
    objectMode,
    write(chunk, _, done) {
      output.push(chunk);
      done();
    },
  });
  return new Promise((resolve, reject) =>
    pipeline(stream, collectStream, (err) => (err ? reject(err) : resolve(output)))
  );
}
