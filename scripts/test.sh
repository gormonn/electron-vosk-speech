#!/bin/bash
whiptail --title "Download language models" --checklist \
"Choose language models" 20 78 4 \
"ru" "Allow connections to other hosts" ON \
"NET_INBOUND" "Allow connections from other hosts" OFF \
"LOCAL_MOUNT" "Allow mounting of local devices" OFF \
"REMOTE_MOUNT" "Allow mounting of remote devices" OFF

# cmd=(dialog --separate-output --checklist "Select options:" 22 76 16)
# options=(1 "Option 1" off    # any option can be set to default to "on"
#          2 "Option 2" off
#          3 "Option 3" off
#          4 "Option 4" off)
# choices=$("${cmd[@]}" "${options[@]}" 2>&1 >/dev/tty)
# clear
# for choice in $choices
# do
#     case $choice in
#         1)
#             echo "First Option"
#             ;;
#         2)
#             echo "Second Option"
#             ;;
#         3)
#             echo "Third Option"
#             ;;
#         4)
#             echo "Fourth Option"
#             ;;
#     esac
# done

# echo "Type yours base url to download ASR models, or ignore this to download from alphacephei.com, followed by [ENTER]:"
# read url
# base_url=${url:-http://alphacephei.com/vosk/models}
# echo $base_url

# base_url=${1:-http://alphacephei.com/vosk/models}
# echo $base_url
# echo "${HOME}/vosk-api/models"
# echo $HOME
# echo /home/$USER