# list: https://alphacephei.com/vosk/models.html
# English

# (1.4G) Trained on Fisher + more or less recent LM. Should be pretty good for generic US English transcription
# sh _model_loader.sh https://alphacephei.com/vosk/models/vosk-model-en-us-aspire-0.2.zip en

# (36M) Lightweight wideband model for Android and RPi
sh _model_loader.sh http://alphacephei.com/vosk/models/vosk-model-small-en-us-0.3.zip en


# Russian

# (2.5G) Big narrowband Russian model for server processing
# sh _model_loader.sh https://alphacephei.com/vosk/models/vosk-model-ru-0.10.zip ru

# (39M) Lightweight wideband model for Android and RPi
sh _model_loader.sh https://alphacephei.com/vosk/models/vosk-model-small-ru-0.4.zip ru

echo "done: true" >> 'models.yaml'
mv models.yaml ../models.yaml