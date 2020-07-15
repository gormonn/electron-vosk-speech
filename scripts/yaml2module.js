const yaml = require('js-yaml')
const fs   = require('fs')
const modelsYaml = yaml.safeLoad(fs.readFileSync(`models.yaml`, 'utf8'))

console.log({modelsYaml})

const list = Object.keys(modelsYaml).filter(key => !['done'].includes(key))
const paths = list.reduce((obj, key) => {
    obj[key] = modelsYaml[key];
    return obj;
}, {})

const models = `module.exports = ${JSON.stringify({list, paths, done: true})}`
fs.writeFileSync(`../src/models.js`, models)