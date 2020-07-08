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

if [ $ext = "wav" ]; then
    runRecognize $file
else
    FILE=$file.wav
    if [ ! -f "$FILE" ]; then
        echo "Converting file to wav"
        python mp32wav.py $file
    fi
    runRecognize $FILE
fi
