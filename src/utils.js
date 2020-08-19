'use-strict'

const { exit } = require('process')

const SPEECH_NAME_DEFAULT = 'speech'
const SPEECH_ACTION_READY = 'SPEECH_ACTION_READY'
const SPEECH_ACTION_DATA = 'SPEECH_ACTION_DATA'
const SPEECH_ACTION_PREPARE_VOCABULARY = 'SPEECH_PREPARE_VOCABULARY'
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

function speechSaverHandler(projectPath, ws, cfg, e, item){
    console.log('!!!', cfg)
    const fs = require('fs')
    const fileName = item.getFilename()
    if(isCorrectFilename(fileName)){
        const savePath = `${projectPath + SPEECH_SAVE_PATH + fileName}.wav`
        if(savePath){
            item.setSavePath(savePath)
            item.once('done', (event, state) => {
                if (state === 'completed') {
                    // webContents.send(SPEECH_ACTION_READY, savePath)
                    ws.send(cfg)
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

function connect2Vosk(webContents, voskSpeechSaver, props = {}){
    const {autostart = true} = props
    if(autostart){
        startVoskNConnect(webContents, voskSpeechSaver, props)
    }else{
        voskWsConnect(webContents, voskSpeechSaver)
    }
}


// docker run -d -p 2700:2700 alphacep/kaldi-ru:latest
function startVoskNConnect(webContents, voskSpeechSaver, props = {}){
    const {exec} = require('child_process')
    const {sudo = false, docker = {}, check = true} = props
    const {image = 'alphacep/kaldi-ru', version = 'latest', port = '2700', name = 'vosk'} = docker

    // this.su = sudo ? 'sudo' : ''
    const su = sudo ? 'sudo ' : ''
    const imageName = `${image}:${version}`
    function joinCommands(...rest){
        return [...rest].join(' && ')
    }
    const command = (string) => {
        return `${su}${string}`
    }
    const checkContainer = command(`docker ps -f name=${name} -a --format '{{.Image}}'`)
    const startServer = command(`docker run --name "${name}" -d -p ${port}:${port} ${imageName}`)
    const restartServer = command(`docker restart ${name}`)
    const containerId = command(`docker ps -f name=${name} -aq`)
    const containerStop = command(`docker stop ${name}`)
    const containerRm = command(`docker rm ${name}`)
    // const containerStop = command(`docker stop $(${containerId})`)
    // const containerRm = command(`docker rm $(${containerId})`)

    // const checkContainer = `${su} docker ps -f name=vosk -a --format '{{.Image}}'`
    // const startServer = `${su} docker run --name "${name}" -d -p ${port}:${port} ${imageName}`
    // const restartServer = `${su} docker restart ${name}`
    // const containerId = `${su} docker ps -f name=vosk -aq`
    // const containerStop = `${su} docker stop $(${containerId})`
    // const containerRm = `${su} docker rm $(${containerId})`
    // joinCommands(containerStop, containerRm)
    // console.log({
    //     checkContainer,
    //     startServer,
    //     restartServer,
    //     containerId,
    //     containerStop,
    //     containerRm,
    //     c1: joinCommands(containerStop, containerRm),
    //     c2: joinCommands(startServer, containerRm)
    // })


    // docker stop $(docker ps -f name=vosk -aq) && docker rm $(docker ps -f name=vosk -aq)
    // const comma = restart ? restartServer : startServer

    if(check){
        // console.log('Vosk-checker 1 checkContainer', checkContainer)
        exec(checkContainer, (err, stdout, stderr) => {
            // console.log('Vosk-checker 2 checkContainer getdata')
            // console.log('checkContainer stdout:',stdout, stdout.length, typeof stdout)
            const startedContainerImageName = stdout.length ? stdout.trim() : false
            if(startedContainerImageName){
                // console.log('Vosk-checker 3 startedContainerImageName')
                if(startedContainerImageName.localeCompare(imageName) == 0){
                    console.log('Vosk-stdout server was already started!', stdout)
                    voskWsConnect(webContents, voskSpeechSaver)
                }else{
                    // console.log(`Ошибка! Запущен: ${startedContainerImageName} В настройках указан: ${imageName}`)
                    throw new Error(`Vosk-checker: Ошибка! контейнеры отличаются! Запущен: ${startedContainerImageName} В настройках указан: ${imageName}`)
                    process.abort()
                }
            }else{
                // console.log('Vosk-checker 5 startVoskNConnect')
                startVoskNConnect(webContents, voskSpeechSaver, {...props, check: false})
            }
        })
    }else{
        const duplicateWarning = `The container name "/${name}" is already in use by container`
        const dockerHandler = (err, stdout, stderr) => {
            const errorHandler = err => {
                const isDuplicateWarning = err.substr(duplicateWarning)
                if(isDuplicateWarning){
                    console.log('Vosk server restarting...', err)
                    console.log('Vosk-exec:', restartServer)
                    exec(restartServer, dockerHandler)
                    // if(this.started) connect2Vosk(webContents, voskSpeechSaver)
                    // this.started = true
                }else{
                    console.log('Vosk server starting error!', err)
                    process.abort()
                    throw new Error('Vosk server starting error!', err)
                }
            }
            // if(err){
            //     errorHandler(`Vosk-err: ${err.toString()}`)
            // }
            if(stderr){
                errorHandler(`Vosk-stderr: ${stderr.toString()}`)
            }
            if(stdout){
                console.log('Vosk-stdout server was started!', stdout)
                voskWsConnect(webContents, voskSpeechSaver)
            }
        }

        console.log('Vosk-exec:', startServer)
        exec(startServer, dockerHandler)
    }
}
function voskWsConnect(webContents, voskSpeechSaver){
    const websocket = require('ws')
    let ws = new websocket('ws://0.0.0.0:2700/asr/ru/')
    ws.on('open', function open() {
        console.log('VOSK-API: Waiting to response...')
        const cfg = {
            config: {
                word_list: 'мтс мегафон',
                sample_rate: 8000
            }
        }
        voskSpeechSaver(webContents, ws, JSON.stringify(cfg))
    })
    ws.on('message', function incoming(data) {
        webContents.send(SPEECH_ACTION_DATA, data)
    })
    ws.on('close', function close() {
        console.log('Vosk close connection!')
        // harcode:
        // т.к. сервер закрывает соединение, обходим пока так:
        webContents.session.removeAllListeners('will-download')
        voskWsConnect(webContents, voskSpeechSaver)
    })
    ws.on('error', function(e) {
        console.error("VOSK-client WS Error: " + e.toString());
    })
    // console.log('voskWsConnect ready')
    // webContents.session.on(SPEECH_ACTION_PREPARE_VOCABULARY, data => {
    //     console.log(SPEECH_ACTION_PREPARE_VOCABULARY, data)
    // })
}
function prepareVocabulary(){
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
    SPEECH_NAME_DEFAULT, SPEECH_ACTION_READY, SPEECH_ACTION_DATA, SPEECH_ACTION_PREPARE_VOCABULARY
}