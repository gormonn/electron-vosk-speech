// const { NlpManager } = require('node-nlp');

// (async () => {
//   // let manager = new NlpManager({ languages: ['ru'], ner: { useDuckling: true } });
//   let manager = new NlpManager({languages: ['en'], ner: { ducklingUrl: 'http://0.0.0.0:8000/parse' } })
//   // manager.addLanguage(['ru']);
//   const result = await manager.process(
//     // 'девятнадцать сорок пять мест на aaa@bbb.ru'
//     // 'девятый ряд пятое шестое и седьмое места'
//     // 'завтра в девять ноль ноль'
//     "today at 9am"
//     // 'today'
//     // 'сегодня'
//   )
//   console.log(JSON.stringify(result, null, 2))
// })();

const websocket = require('ws');
const fs = require('fs');
const ws = new websocket('ws://0.0.0.0:2700/asr/ru/');

ws.on('open', function open() {
  var readStream = fs.createReadStream('test.wav');
  readStream.on('data', function (chunk) {
      ws.send(chunk);
  });
  readStream.on('end', function () {
      ws.send('{"eof" : 1}');
  });
});

ws.on('message', function incoming(data) {
  console.log(data);
});

ws.on('close', function close() {
  process.exit()
});
