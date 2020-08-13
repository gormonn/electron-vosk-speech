'use-strict'

const { exit } = require('process')

const SPEECH_NAME_DEFAULT = 'speech'
const SPEECH_ACTION_READY = 'SPEECH_ACTION_READY'
const SPEECH_ACTION_DATA = 'SPEECH_ACTION_DATA'
const SPEECH_DATA_SEPARATOR = '___SDS___'
const SPEECH_GOOGLE_RESULT_SEPARATOR = '___GRS___'
const SPEECH_SAVE_PATH = '/tmp/speech/'
const SPEECH_SAVE_PATH_L = SPEECH_SAVE_PATH + '70-80/' // low confidence
const SPEECH_SAVE_PATH_H = SPEECH_SAVE_PATH + '90/' // high confidence

const zip = (array, separator) =>
    array.join(separator)

const unzip = (string, separator) =>
    string.split(separator)

/**
 * Сохранение результатов распознавания в строку имени файла
 * где:
 * SPEECH_NAME_DEFAULT - Ключевое имя, для корректного перехвата
 * события will-download при скачивании файла
 * results: [
 *  transcript, - результат распознавания речи от гугла
 *  confidence  - степень доверия нейросети к корректности распознавания
 * ]
 * Считаю, что для корректного обучения Kaldi(VOSK-API) требуются значения не ниже 0,9
 * * @param {*} results 
 */
const zipResults = (res) => {
    const { results } = res
    const alternatives = (results && results[0] ? results[0].alternatives : null)
    const transcript = (alternatives && alternatives[0] ? alternatives[0].transcript : '')
    const confidence = (alternatives && alternatives[0] ? alternatives[0].confidence : '')
    const zippedResults = zip([transcript,confidence], SPEECH_GOOGLE_RESULT_SEPARATOR)
    return zip([SPEECH_NAME_DEFAULT, zippedResults], SPEECH_DATA_SEPARATOR)
}
const unzipResults = string => {
    const [fileName, results] = unzip(string, SPEECH_DATA_SEPARATOR)
    const [transcript, confidence] = unzip(results, SPEECH_GOOGLE_RESULT_SEPARATOR)
    return {fileName, transcript, confidence}
}
const isCorrectFilename = fileName =>
    fileName === SPEECH_NAME_DEFAULT

// const setMetadataCallback = (err) => {
//     const ffmetadata = require("ffmetadata")
//     if (err) console.error("Error writing metadata", err)
//     else console.log("Data written")

//     ffmetadata.read(savePath, function(err, data) {
//         if (err) console.error("ffmetadata Error reading metadata", err)
//         else console.log('ffmetadata', data)
//         // console.log('need to put:', transcription)
//     })
// }
// /**
//  * title - is a transcript
//  * comment - is a confidence
//  * @param {*} savePath 
//  * @param {*} param1 
//  */
// const setMetadata = (savePath, [title, comment], cb = setMetadataCallback) => {
//     const ffmetadata = require("ffmetadata")
//     ffmetadata.write(savePath, {title, comment}, cb)
// }

function speechSaverHandler(projectPath, ws, e, item){
    const fs = require('fs')
    const fileName = item.getFilename()
    if(isCorrectFilename(fileName)){
        const savePath = `${projectPath + SPEECH_SAVE_PATH + fileName}.wav`
        if(savePath){
            item.setSavePath(savePath)
            item.once('done', (event, state) => {
                if (state === 'completed') {
                    // webContents.send(SPEECH_ACTION_READY, savePath)
                    const readStream = fs.createReadStream(savePath)
                    readStream.on('data', function (chunk) {
                        ws.send(chunk)
                    })
                    readStream.on('end', function () {
                        ws.send('{"eof" : 1}')
                    })
                } else {
                    console.log(`Download failed: ${state}`)
                }
            })
        }
    }else{
        console.log("A speech file won't save")
        e.preventDefault()
    }
}
// docker run -d -p 2700:2700 alphacep/kaldi-ru:latest
function startVoskNConnect(webContents, voskSpeechSaver){
    const {exec} = require('child_process')
    exec('docker run -d -p 2700:2700 alphacep/kaldi-ru:latest', (err, stdout, stderr) => {
        // console.log('startVoskNConnect',{err,stdout,stderr})
        // connect2Vosk(webContents, voskSpeechSaver)
        const errorMessage = err => {
            console.log('Vosk server starting error!', err)
            throw new Error('Vosk server starting error!', err)
        }
        const errorHandler = err => {
            if(err.toString().substr('port is already allocated')){
                console.log('Vosk server was already started!')
                connect2Vosk(webContents, voskSpeechSaver)
            }else{
                errorMessage(err)
                process.abort()
            }
        }
        
        if(err){
            errorHandler(err)
        }
        if(stderr){
            errorHandler(`stderr: ${stderr}`)
        }
        if(stdout){
            console.log('Vosk server was started!', stdout)
            connect2Vosk(webContents, voskSpeechSaver)
        }
    })
}
function connect2Vosk(webContents, voskSpeechSaver){
    const websocket = require('ws')
    let ws = new websocket('ws://0.0.0.0:2700/asr/ru/')
    ws.on('open', function open() {
        console.log('VOSK-API: Waiting to response...')
        voskSpeechSaver(webContents, ws)
    })
    ws.on('message', function incoming(data) {
        webContents.send(SPEECH_ACTION_DATA, data)
    })
    ws.on('close', function close() {
        // harcode:
        // т.к. сервер закрывает соединение, обходим пока так:
        webContents.session.removeAllListeners('will-download')
        connect2Vosk(webContents, voskSpeechSaver)
    })
    ws.on('error', function(e) {
        console.error("WS Error: " + e.toString());
    })
}

// (async()=>{
//     voskSocket()
// })()

// Example use:
// const {speechSaverHandler, connect2Vosk } = require('electron-vosk-speech/src/utils')
// connect2Vosk(win.webContents, () => {
//     win.webContents.session.on('will-download', function voskSpeechSaver(...rest){
//         speechSaverHandler(app.getAppPath(), ...rest) // for new version
//     })
// })

module.exports = {
    // voskSocket,
    connect2Vosk,
    zipResults, unzipResults, isCorrectFilename, speechSaverHandler,
    startVoskNConnect,
    SPEECH_NAME_DEFAULT, SPEECH_ACTION_READY, SPEECH_ACTION_DATA
}