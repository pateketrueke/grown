const fs = require('fs');
const assert = require('assert'); // eslint-disable-line

fs.mkdirSync('./tasks');
fs.writeFileSync('./tasks/example.js',
  `module.exports = {
    description: 'Example task',
    callback() {
      console.log('It works.')
    },
  };`);

const stripAnsi = require('strip-ansi');

const toString = value => String(Buffer.from(value));
const normalizeText = msg => stripAnsi(msg.replace(/[\r\n\b]/g, ''));

process.stdout.write = msg => console.log(normalizeText(toString(msg)));
