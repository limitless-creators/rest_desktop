; Isolated harness: no registry, shortcuts, user database or real installation.
Unicode true
RequestExecutionLevel user
Name "REST — pré-visualização do instalador"
OutFile "..\test-results\REST-Installer-Check.exe"
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
Section "Check"
 SetOutPath "$INSTDIR"
 File "..\test-results\REST-Launch-Probe.exe"
 Call RestLaunchApp
 IfFileExists "$INSTDIR\launch-confirmed.txt" failed 0
 SetSilent normal
 SetRebootFlag true
 Call RestLaunchApp
 IfFileExists "$INSTDIR\launch-confirmed.txt" failed 0
 SetRebootFlag false
 Call RestLaunchApp
 Call RestLaunchApp
 Sleep 4000
 IfFileExists "$INSTDIR\launch-confirmed.txt" 0 failed
 FileOpen $1 "$INSTDIR\launch-confirmed.txt" r
 FileRead $1 $2
 StrCmp $2 "" failed
 ClearErrors
 FileRead $1 $2
 IfErrors passed failed
passed:
 FileClose $1
 FileOpen $1 "$INSTDIR\result.txt" w
 FileWrite $1 "PASS: silent guard; reboot guard; automatic launch exactly once"
 FileClose $1
 SetSilent silent
 Goto done
failed:
 SetSilent silent
 SetErrorLevel 1
done:
SectionEnd
