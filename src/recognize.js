'use-strict'
const spawn = require('await-spawn')

async function recognize(speechPath, lang, voskPath = 'node_modules/electron-vosk-speech/src/vosk'){
    // const args = [`${voskPath}/test_simple.py`, speechPath, `${voskPath}/models/${lang}`]
    const args = [`${__dirname}/vosk/test_simple.py`, speechPath, `${__dirname}/vosk/models/${lang}`]
    console.log({args})
    const res = await spawn('python3', args)
    return res.toString()
}

// example use:
// (async () => {
//     const res = await recognize('vosk/test.wav', 'ru-RU')
//     console.log(res)
// })()

module.exports = recognize