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

class VoskConnector{
    constructor(props){
        const {
            autostart = true,
            sudo = false,
            check = true,
            docker = {},
            config = {}
        } = props
        this.autostart = autostart
        this.sudo = sudo
        this.check = check

        const {
            image = 'alphacep/kaldi-ru',
            version = 'latest',
            port = '2700',
            name = 'vosk'
        } = docker
        this.docker = {image, version, port, name}

        const {
            word_list = false,
            sample_rate = 8000
        } = config

        this.config = this.createConfig(word_list, sample_rate)
        this.checkContainerHandler = this.checkContainerHandler.bind(this)
        this.startServerHandler = this.startServerHandler.bind(this)
        this.connect = this.connect.bind(this)
        this.speechSaverHandler = this.speechSaverHandler.bind(this)
        
    }
    init(webContents, voskSpeechSaver){
        this.webContents = webContents
        this.voskSpeechSaver = voskSpeechSaver
        const {image, version, name} = this.docker
        this.imageName = `${image}:${version}`
        this.duplicateWarning = `The container name "/${name}" is already in use by container`
        this.commands = this.createCommands()

        console.log('vosk init', this.autostart)
        if(this.autostart){
            this.startServer()
        }else{
            this.connect()
        }
    }
    speechSaverHandler(projectPath, ws, e, item){
        // console.log('!!!', cfg)
        const fs = require('fs')
        const fileName = item.getFilename()
        if(isCorrectFilename(fileName)){
            const savePath = `${projectPath + SPEECH_SAVE_PATH + fileName}.wav`
            if(savePath){
                item.setSavePath(savePath)
                item.once('done', (event, state) => {
                    if (state === 'completed') {
                        // webContents.send(SPEECH_ACTION_READY, savePath)
                        ws.send(this.config)
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
    connect(){
        const websocket = require('ws')
        const {webContents, voskSpeechSaver, connect} = this
        const ws = new websocket('ws://0.0.0.0:2700/asr/ru/')
        const spam = false
        ws.on('open', function open() {
            spam && console.log('VOSK-API: Waiting to response...')
            voskSpeechSaver(ws)
        })
        ws.on('message', function incoming(data) {
            webContents.send(SPEECH_ACTION_DATA, data)
        })
        ws.on('close', function close() {
            spam && console.log('Vosk close connection!')
            // harcode:
            // т.к. сервер закрывает соединение, обходим пока так:
            webContents.session.removeAllListeners('will-download')
            connect()
        })
        ws.on('error', function(e) {
            spam && console.error("VOSK-client WS Error: " + e.toString());
        })
        // console.log('voskWsConnect ready')
        // webContents.session.on(SPEECH_ACTION_PREPARE_VOCABULARY, data => {
        //     console.log(SPEECH_ACTION_PREPARE_VOCABULARY, data)
        // })
    }
    startServer(){
        const {exec} = require('child_process')
        const {checkContainer, startServer} = this.commands
        if(this.check){
            exec(checkContainer, this.checkContainerHandler)
        }else{
            console.log('Vosk-exec:', startServer)
            exec(startServer, this.startServerHandler)
        }
    }
    createConfig(word_list, sample_rate){
        const isNeedToConfigure = sample_rate || word_list
        let cfg = {}
        if(isNeedToConfigure){
            cfg = {config: {}}
            if(word_list) cfg.config.word_list = word_list
            if(sample_rate) cfg.config.sample_rate = sample_rate
        }
        return JSON.stringify(cfg)
    }
    createCommands(){
        const {port, name} = this.docker
        const su = this.sudo ? 'sudo ' : ''
        const command = (string) => {
            return `${su}${string}`
        }
        const checkContainer = command(`docker ps -f name=${name} -a --format '{{.Image}}'`)
        const startServer = command(`docker run --name "${name}" -d -p ${port}:${port} ${this.imageName}`)
        const restartServer = command(`docker restart ${name}`)
        const containerId = command(`docker ps -f name=${name} -aq`)
        const containerStop = command(`docker stop ${name}`)
        const containerRm = command(`docker rm ${name}`)
        return {
            checkContainer,
            startServer,
            restartServer,
            containerId,
            containerStop,
            containerRm
        }
    }
    joinCommands(...rest){
        return [...rest].join(' && ')
    }
    checkContainerHandler(err, stdout, stderr){
        const {exec} = require('child_process')
        const { imageName } = this
        const {restartServer} = this.commands
        const startedContainerImageName = stdout.length ? stdout.trim() : false
        if(startedContainerImageName){
            if(startedContainerImageName.localeCompare(imageName) == 0){
                console.log('Vosk-stdout server was already started!', stdout)
                // restart and connect
                exec(restartServer, this.startServerHandler)
            }else{
                const err = `Vosk-checker: Ошибка! контейнеры отличаются! Запущен: ${startedContainerImageName} В настройках указан: ${imageName}`
                console.error(err)
                process.exit(1)
                throw new Error(err)
            }
        }else{
            this.check = false
            this.startServer()
        }
    }
    startServerHandler(err, stdout, stderr){
        const {restartServer} = this.commands
        const errorHandler = err => {
            const isDuplicateWarning = err.substr(this.duplicateWarning)
            if(isDuplicateWarning){
                console.log('Vosk server restarting...', err)
                console.log('Vosk-exec:', restartServer)
                exec(restartServer, this.startServerHandler)
            }else{
                // console.log('Vosk server starting error!', err)
                // process.abort()
                const err1 = `Vosk server starting error: ${err}`
                console.error(err1)
                process.exit(1)
                throw new Error(err1)
            }
        }
        // if(err){a
        //     errorHandler(`Vosk-err: ${err.toString()}`)
        // }
        if(stderr){
            errorHandler(`Vosk-stderr: ${stderr.toString()}`)
        }
        if(stdout){
            console.log('Vosk-stdout server was started!', stdout)
            this.connect()
        }
    }
}

module.exports = {
    zipResults, unzipResults, isCorrectFilename,
    VoskConnector,
    SPEECH_NAME_DEFAULT, SPEECH_ACTION_READY, SPEECH_ACTION_DATA, SPEECH_ACTION_PREPARE_VOCABULARY
}