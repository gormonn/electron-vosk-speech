#!/bin/bash

name='vosk'

# $(docker ps -f "name=$name" --format '{{.Names}}') == $name ||
# docker run --name "$name" -d -p 2700:2700 alphacep/kaldi-ru:latest

if ! docker ps --format '{{.Names}}' | grep -w "$name" &> /dev/null; then
    docker run --name "$name" -d -p 2700:2700 alphacep/kaldi-ru:latest
fi
