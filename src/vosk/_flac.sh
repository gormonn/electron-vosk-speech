file=$1
ext="${file##*.}"
name="${file%.*}"
model=$2
# echo $name
# echo $ext
# echo $file.wav


runRecognize(){
    echo "Starting vosk-api"
    python test_simple.py $1 $model
}

FILE=$file.flac
if [ ! -f "$FILE" ]; then
    echo "Converting file to flac"
    python 2flac.py $file
fi
runRecognize $FILE