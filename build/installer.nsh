; REST native wizard. Images are bundled; no network dependency.
!include LogicLib.nsh
!include WinMessages.nsh
!ifndef BUILD_UNINSTALLER
!define MUI_UI "${BUILD_RESOURCES_DIR}\installer\modern-rest.exe"
!define MUI_UI_HEADERIMAGE_RIGHT "${BUILD_RESOURCES_DIR}\installer\header-rest.exe"
!define MUI_BGCOLOR "FFFFFF"
!define MUI_TEXTCOLOR "14234B"
!define /redef MUI_WELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer\sidebar.bmp"
!define /redef MUI_UNWELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer\sidebar.bmp"
!define MUI_CUSTOMFUNCTION_GUIINIT RestGuiInit
Var RestStarted
Var RestSlideWindow
Var RestPage
Var RestImage
Var RestTitle
Var RestText
Var RestTitleFont
Var RestTextFont
!macro customWelcomePage
 !define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao REST Desktop"
 !define MUI_WELCOMEPAGE_TEXT "O seu espaço de gestão, neste computador.$\r$\n$\r$\nFacturação, inventário e resultados, mesmo sem ligação à internet.$\r$\n$\r$\nEste assistente prepara tudo para começar. Nas actualizações, os seus dados locais são preservados."
 !define MUI_PAGE_CUSTOMFUNCTION_SHOW RestWelcomeShow
 !insertmacro MUI_PAGE_WELCOME
!macroend
!macro customPageAfterChangeDir
 ; Preserve electron-builder's instFilesPre validation.
 !define MUI_PAGE_CUSTOMFUNCTION_SHOW RestInstallShow
 !define MUI_PAGE_CUSTOMFUNCTION_LEAVE RestInstallLeave
!macroend
!macro customFinishPage
 !define MUI_FINISHPAGE_TITLE "Tudo pronto para começar."
 !define MUI_FINISHPAGE_TEXT "O REST Desktop foi instalado com sucesso.$\r$\n$\r$\nA aplicação está a abrir automaticamente.$\r$\n$\r$\nPode fechar este assistente e começar a gerir o seu negócio."
 !define MUI_FINISHPAGE_BUTTON "Concluir"
 !define MUI_PAGE_CUSTOMFUNCTION_SHOW RestFinishShow
 !insertmacro MUI_PAGE_FINISH
!macroend
!macro customHeader
Function RestGuiInit
 SendMessage $mui.Branding.Text ${WM_SETTEXT} 0 "STR:Limitless, Lda  |  REST Desktop ${VERSION}"
 CreateFont $RestTitleFont "Segoe UI" 19 600
 CreateFont $RestTextFont "Segoe UI" 10 400
FunctionEnd
Function RestFullPageLayout
 System::Call '*(i,i,i,i) p.r0'
 System::Call 'user32::GetClientRect(p $RestPage, p r0)'
 System::Call '*$0(i,i,i.r1,i.r2)'
 System::Free $0
 IntOp $3 $1 * 32
 IntOp $3 $3 / 100
 System::Call 'user32::MoveWindow(p $RestImage, i 0, i 0, i r3, i r2, i 1)'
 IntOp $4 $1 * 39
 IntOp $4 $4 / 100
 IntOp $5 $1 - $4
 IntOp $5 $5 - 36
 IntOp $6 $2 / 7
 IntOp $7 $2 / 5
 System::Call 'user32::MoveWindow(p $RestTitle, i r4, i r6, i r5, i r7, i 1)'
 IntOp $6 $6 + $7
 IntOp $7 $2 - $6
 IntOp $7 $7 - 25
 System::Call 'user32::MoveWindow(p $RestText, i r4, i r6, i r5, i r7, i 1)'
 SendMessage $RestTitle ${WM_SETFONT} $RestTitleFont 1
 SendMessage $RestText ${WM_SETFONT} $RestTextFont 1
FunctionEnd
Function RestWelcomeShow
 StrCpy $RestPage $mui.WelcomePage
 StrCpy $RestImage $mui.WelcomePage.Image
 StrCpy $RestTitle $mui.WelcomePage.Title
 StrCpy $RestText $mui.WelcomePage.Text
 Call RestFullPageLayout
 ${NSD_FreeImage} $mui.WelcomePage.Image.Bitmap
 !insertmacro MUI_INTERNAL_FULLWINDOW_LOADWIZARDIMAGE "" $mui.WelcomePage.Image $PLUGINSDIR\modern-wizard.bmp $mui.WelcomePage.Image.Bitmap
FunctionEnd
Function RestInstallShow
 !insertmacro MUI_HEADER_TEXT "A preparar o seu espaço de trabalho" "Conheça o REST enquanto a instalação decorre."
 InitPluginsDir
 SetOutPath "$PLUGINSDIR\RestSlides"
 File "${BUILD_RESOURCES_DIR}\installer\slide-*.png"
 File "${BUILD_RESOURCES_DIR}\installer\slides.dat"
 SetOutPath "$INSTDIR"
 ShowWindow $mui.InstFilesPage.ShowLogButton ${SW_HIDE}
 ShowWindow $mui.InstFilesPage.Log ${SW_HIDE}
 System::Call '*(i,i,i,i) p.r0'
 System::Call 'user32::GetClientRect(p $mui.InstFilesPage, p r0)'
 System::Call '*$0(i,i,i.r1,i.r2)'
 System::Free $0
 IntOp $3 $2 - 64
 System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w "", i 0x50000000, i 0, i 0, i r1, i r3, p $mui.InstFilesPage, p 0, p 0, p 0) p.s'
 Pop $RestSlideWindow
 IntOp $4 $2 - 44
 System::Call 'user32::MoveWindow(p $mui.InstFilesPage.Text, i 0, i r4, i r1, i 18, i 1)'
 IntOp $4 $2 - 20
 System::Call 'user32::MoveWindow(p $mui.InstFilesPage.ProgressBar, i 0, i r4, i r1, i 12, i 1)'
 System::Call 'uxtheme::SetWindowTheme(p $mui.InstFilesPage.ProgressBar, w "", w "")'
 SendMessage $mui.InstFilesPage.ProgressBar 0x0409 0 0x224D80
 SendMessage $mui.InstFilesPage.ProgressBar 0x2001 0 0xF0EBE5
 nsisSlideshow::show /NOUNLOAD "/HWND=$RestSlideWindow" /FIT=BOTH "/auto=$PLUGINSDIR\RestSlides\slides.dat"
FunctionEnd
Function RestInstallLeave
 nsisSlideshow::stop
 System::Call 'user32::DestroyWindow(p $RestSlideWindow)'
 StrCpy $RestSlideWindow ""
FunctionEnd
Function RestFinishShow
 StrCpy $RestPage $mui.FinishPage
 StrCpy $RestImage $mui.FinishPage.Image
 StrCpy $RestTitle $mui.FinishPage.Title
 StrCpy $RestText $mui.FinishPage.Text
 Call RestFullPageLayout
 ${NSD_FreeImage} $mui.FinishPage.Image.Bitmap
 !insertmacro MUI_INTERNAL_FULLWINDOW_LOADWIZARDIMAGE "" $mui.FinishPage.Image $PLUGINSDIR\modern-wizard.bmp $mui.FinishPage.Image.Bitmap
 Call RestLaunchApp
FunctionEnd
Function RestLaunchApp
 ; Successful interactive installs only. Never launch on silent /S.
 ${IfNot} ${Silent}
 ${AndIf} $RestStarted != "1"
  IfRebootFlag rest_launch_done
  IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 rest_launch_failed
  StrCpy $RestStarted "1"
  ${StdUtils.ExecShellAsUser} $0 "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "open" ""
  StrCmp $0 "error" rest_launch_failed
  Goto rest_launch_done
rest_launch_failed:
  SendMessage $RestText ${WM_SETTEXT} 0 "STR:O REST Desktop foi instalado com sucesso.$\r$\n$\r$\nAbra a aplicação pelo atalho REST Desktop no ambiente de trabalho ou no menu Iniciar."
rest_launch_done:
 ${EndIf}
FunctionEnd
!macroend
!endif
