; Isolated harness: no registry, shortcuts, user database or real installation.
Unicode true
RequestExecutionLevel user
Name "REST — pré-visualização do instalador"
OutFile "..\test-results\REST-Installer-Preview.exe"
InstallDir "$TEMP\REST-Installer-Preview"
!define VERSION "1.4.0"
!define APP_EXECUTABLE_FILENAME "REST-Launch-Probe.exe"
!define BUILD_RESOURCES_DIR "..\build"
!addincludedir "..\node_modules\app-builder-lib\templates\nsis\include"
!include StdUtils.nsh
!addplugindir /x86-unicode "..\build\x86-unicode"
!addplugindir /x86-unicode "$%LOCALAPPDATA%\electron-builder\Cache\nsis-resources-3.4.1\nsis-resources-3.4.1-2jx2y\plugins\x86-unicode"
!define MUI_ICON "..\electron\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "..\build\installer\header.bmp"
!include MUI2.nsh
!include "..\build\installer.nsh"
ShowInstDetails nevershow
!insertmacro customWelcomePage
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro customPageAfterChangeDir
!insertmacro MUI_PAGE_INSTFILES
!insertmacro customFinishPage
!insertmacro MUI_LANGUAGE "Portuguese"
!insertmacro customHeader
Section "Preview"
 SetOutPath "$INSTDIR"
 File "..\test-results\REST-Launch-Probe.exe"
 DetailPrint "A instalar ficheiros de demonstração... 1/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 2/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 3/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 4/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 5/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 6/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 7/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 8/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 9/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 10/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 11/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 12/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 13/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 14/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 15/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 16/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 17/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 18/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 19/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 20/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 21/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 22/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 23/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 24/25"
 Sleep 1000
 DetailPrint "A instalar ficheiros de demonstração... 25/25"
 Sleep 1000
SectionEnd
