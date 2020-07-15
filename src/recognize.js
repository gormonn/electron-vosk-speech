'use-strict'
const spawn = require('await-spawn')
const yaml = require('js-yaml');
const fs   = require('fs');

function getModelPath(key){
    try {
        const models = yaml.safeLoad(fs.readFileSync(`${__dirname}/vosk/models.yaml`, 'utf8'))
        if(models.done){
            return models.hasOwnProperty(key) ? models[key] : false
        }else{
            throw new Error('recognize: Before using speech recognition, you must download the model!')
        }
    } catch (e) {
        console.error(e)
        return false
    }
}

// (async()=>{
//     const r = await recognize('', 'ru1')
//     console.log(r)
// })()

async function recognize(speechPath, lang, voskPath = 'node_modules/electron-vosk-speech/src/vosk'){
    try{
        // console.log(__dirname,{args})
        // const args = [`${voskPath}/test_simple.py`, speechPath, `${voskPath}/models/${lang}`]
        const pathToModel = getModelPath(lang)
        if(pathToModel && speechPath){
            const args = [`${__dirname}/vosk/test_simple.py`, speechPath, pathToModel]
            console.log({args: args.join(' ')})
            const res = await spawn('python3', args)
            return res.toString()
        }
        if(!pathToModel){
            throw new Error(`recognize: Can't find path to selected model "${lang}" in "/node_modules/src/vosk/models.yaml" file.\r\nYou can correct this manualy, or reinstall models.`
            )
        }
        if(!speechPath.length){
            throw new Error(`recognize: speechPath is Empty`)
        }
    }catch(e){
        console.error(e)
        return false
    }
}

// example use:
// (async () => {
//     const res = await recognize('vosk/test.wav', 'ru-RU')
//     console.log(res)
// })()

module.exports = recognize