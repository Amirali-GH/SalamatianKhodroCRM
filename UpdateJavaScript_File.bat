@echo off
setlocal

set FILE_PATH=D:\MyProject\SalamatSaleDepartment\MainWebSite\WWW\scripts\script.js
set SERVER_USER=root
set SERVER_PASS=yeY92B9Zx3
set SERVER_IP=62.60.214.159
set REMOTE_PATH=/root/PAServer/scratch-dir/amira-AmirAli/Project.SalamatianCutomer/WWW/scripts/

echo Uploading %FILE_PATH% to %SERVER_USER%@%SERVER_IP%:%REMOTE_PATH%
pscp.exe -pw %SERVER_PASS% %FILE_PATH% %SERVER_USER%@%SERVER_IP%:%REMOTE_PATH%

echo Done!
pause
