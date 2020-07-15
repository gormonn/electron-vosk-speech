# !/bin/bash
url=$1
# url="https://github.com/daanzu/kaldi-active-grammar/releases/download/v1.4.0/vosk-model-en-us-daanzu-20200328.zip"
file="${url##*/}"
name="${file%.*}"
# echo $file
# echo $name

# ubuntu
modelfolder="${HOME}/vosk-api/models"

wget $url
unzip $name
mkdir --parents $modelfolder
mv $name $modelfolder
mv "${modelfolder}/${name}" "${modelfolder}/${2}"
rm $file

echo "${2}: ${modelfolder}/${2}" >> 'models.yaml'