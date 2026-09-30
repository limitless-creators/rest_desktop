; Isolated harness: no registry, shortcuts, user database or real installation.
Unicode true
RequestExecutionLevel user
Name "REST — pré-visualização do instalador"
OutFile "..\test-results\REST-Installer-Slideshow-Check.exe"
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
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipTestPage
!insertmacro customWelcomePage

!insertmacro customPageAfterChangeDir
!insertmacro MUI_PAGE_INSTFILES
!insertmacro customFinishPage
!insertmacro MUI_LANGUAGE "Portuguese"
!insertmacro customHeader
Function SkipTestPage
 Abort
FunctionEnd
Section "Check"
 SetOutPath "$INSTDIR"
 Sleep 1200
 System::Call '*(i,i,i,i) p.r0'
 System::Call 'user32::GetClientRect(p $RestSlideWindow, p r0)'
 System::Call '*$0(i,i,i.r1,i.r2)'
 System::Free $0
 IntOp $5 $2 * 1080
 IntOp $5 $5 / 465
 IntCmp $5 $1 heightfit heightfit widthfit
heightfit:
 IntOp $3 $1 - $5
 IntOp $3 $3 / 2
 IntOp $4 $5 * 48
 IntOp $4 $4 / 1080
 IntOp $3 $3 + $4
 IntOp $4 $2 * 319
 IntOp $4 $4 / 465
 Goto pixelready
widthfit:
 IntOp $3 $1 * 48
 IntOp $3 $3 / 1080
 IntOp $4 $1 * 465
 IntOp $4 $4 / 1080
 IntOp $4 $2 - $4
 IntOp $4 $4 / 2
 IntOp $5 $1 * 319
 IntOp $5 $5 / 1080
 IntOp $4 $4 + $5
pixelready:
 System::Call 'user32::GetDC(p $RestSlideWindow) p.r6'
 System::Call 'gdi32::GetPixel(p r6, i r3, i r4) i.r7'
 Sleep 5200
 System::Call 'gdi32::GetPixel(p r6, i r3, i r4) i.r8'
 System::Call 'user32::ReleaseDC(p $RestSlideWindow, p r6)'
 FileOpen $0 "$INSTDIR\slideshow-result.txt" w
 FileWrite $0 "Bounds=$1x$2; pixel=$3,$4; first=$7; second=$8$\r$\n"
 StrCmp $7 -1 failed
 StrCmp $8 -1 failed
 StrCmp $7 $8 failed
 FileWrite $0 "PASS: native slideshow changed while installation was running"
 FileClose $0
 Call RestInstallLeave
 SetErrorLevel 0
 Quit
failed:
 FileWrite $0 "FAIL: native slideshow did not change"
 FileClose $0
 Call RestInstallLeave
 SetErrorLevel 1
 Quit
SectionEnd
