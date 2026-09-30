/***************************************************
* Banner/Slideshow plugin for NSIS - (c) 2009 Olivier Marcoux
2006-06-21 v1.0: initial EBanner plugin code by Takhir Bedertdinov
2009-01-08 v1.1: large rewrite. no more flickering
2009-02-17 v1.2: automatic crossfade in background
2009-06-16 v1.3: added automatic slideshow mode using a Slides folder
2009-08-19 v1.4: renamed plugin to nsisSlideshow. documentation
2009-09-07 v1.5: porting to Unicode NSIS
2010-04-27 v1.6: fixed 2 bugs in automatic mode
2011-05-07 v1.7: compatibility with IE9
**************************************************/
#include <windows.h>
#include <shlwapi.h>
#include <IImgCtx.h>
#include "exdll.h"

#ifndef _countof
#define _countof(A) (sizeof(A)/sizeof((A)[0]))
#endif

// array of precalculated alpha values for a linear crossfade in 15 steps
const BYTE SCA_Steps[15] = { 17, 18, 20, 21, 23, 26, 28, 32, 36, 43, 51, 64, 85, 127, 255 };
int     g_step = 0;
HWND    g_hWnd = NULL;
HDC     g_hdcMem = NULL;
HBITMAP g_hbmMem = NULL;
TCHAR   g_autoPath[MAX_PATH];
LPTSTR  g_autoBuffer = NULL;
LPTSTR  g_autoNext = NULL;
int     g_autoDelay = 0;
RECT    rDest;
int     wDest, hDest;
WNDPROC lpPrevWndFunc = NULL;
enum HAlign {
    HALIGN_CENTER = 0,
    HALIGN_LEFT,
    HALIGN_RIGHT
} iHAlign;
enum VAlign {
    VALIGN_CENTER = 0,
    VALIGN_TOP,
    VALIGN_BOTTOM
} iVAlign;
enum Fit {
    FIT_STRETCH = 0,
    FIT_WIDTH,
    FIT_HEIGHT,
    FIT_BOTH
} iFit;
COLORREF captionColor;

static LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

/*****************************************************
 * Abort: stops current processing, detach from WndProc and release resources
 *****************************************************/
void Abort(bool stayAuto = false)
{
    KillTimer(g_hWnd, 'XFBN');
    if (!stayAuto)
    {
        if (lpPrevWndFunc != NULL && IsWindow(g_hWnd))
        {
            if ((WNDPROC) GetWindowLong(g_hWnd, GWL_WNDPROC) == WndProc)
                SetWindowLongPtr(g_hWnd, GWL_WNDPROC, (long)lpPrevWndFunc);
        }
        lpPrevWndFunc = NULL;
        GlobalFree(g_autoBuffer);
        g_autoBuffer = NULL;
        g_autoNext = NULL;
        g_autoDelay = false;
    }
    DeleteDC(g_hdcMem);
    g_hdcMem = NULL;
    DeleteObject(g_hbmMem);
    g_hbmMem = NULL;
}

void NewImage(LPCTSTR imgPath, LPCTSTR caption, int duration)
{
#ifdef _UNICODE
	LPCWSTR imgPathW = imgPath;
#else
    WCHAR imgPathW[MAX_PATH];
    MultiByteToWideChar(CP_ACP, 0, imgPath, -1, imgPathW, _countof(imgPathW));
#endif
    IImgCtx *pImage = NULL;
    SIZE imgSize = {0, 0};
    if (SUCCEEDED(CoCreateInstance(CLSID_IImgCtx, NULL, CLSCTX_ALL, IID_IImgCtx, (void**)&pImage)))
    {
        if (SUCCEEDED(pImage->Load(imgPathW, 0)))
        {
            DWORD dwState;
            while (SUCCEEDED(pImage->GetStateInfo(&dwState, NULL, true)) && (dwState & (IMGLOAD_COMPLETE|IMGLOAD_ERROR)) == 0)
                Sleep(20);
            pImage->GetStateInfo(&dwState, &imgSize, true);
        }
        if (imgSize.cx == 0 || imgSize.cy == 0) // error path or format (IMGLOAD_ERROR)
        {
            pImage->Release();
            pImage = NULL;
        }
    }
    if (pImage == NULL)
        return;

    // fit image
    wDest = rDest.right - rDest.left;
    hDest = rDest.bottom - rDest.top;
    if (iFit == FIT_BOTH)
        iFit = (wDest*imgSize.cy > imgSize.cx*hDest) ? FIT_HEIGHT : FIT_WIDTH;
    if (iFit == FIT_HEIGHT)
        wDest = (imgSize.cx * hDest) / imgSize.cy;
    else if (iFit == FIT_WIDTH)
        hDest = (imgSize.cy * wDest) / imgSize.cx;

    // align image
    if (iHAlign == HALIGN_CENTER) rDest.left = (rDest.left + rDest.right - wDest) / 2;
    else if (iHAlign == HALIGN_RIGHT) rDest.left = rDest.right - wDest;
    if (iVAlign == VALIGN_CENTER) rDest.top  = (rDest.top + rDest.bottom - hDest) / 2;
    else if (iVAlign == VALIGN_BOTTOM) rDest.top = rDest.bottom - hDest;
    rDest.right = rDest.left + wDest;
    rDest.bottom = rDest.top + hDest;

    // create memory DC & Bitmap compatible with window's DC
    HDC hWndDC = GetDC(g_hWnd);
    g_hdcMem = CreateCompatibleDC(hWndDC);
    g_hbmMem = CreateCompatibleBitmap(hWndDC, wDest, hDest);
    ReleaseDC(g_hWnd, hWndDC);
    SelectObject(g_hdcMem, g_hbmMem);

    // paint image in memory DC
    RECT bounds = { 0, 0, wDest, hDest };
    pImage->Draw(g_hdcMem, &bounds);
    pImage->Release(); // we don't need the image anymore

    if (caption[0] != '\0')
    {
        LOGFONT lf;
        GetObject((HFONT) ::SendMessage(g_hWnd, WM_GETFONT, 0, 0), sizeof(lf), &lf);
        lf.lfHeight += lf.lfHeight/2;
        HFONT hFont = CreateFontIndirect(&lf);
        HGDIOBJ hOldFont = SelectObject(g_hdcMem, hFont);
        SetTextColor(g_hdcMem, captionColor);
        SetBkMode(g_hdcMem, TRANSPARENT);
        SetTextAlign(g_hdcMem, TA_BOTTOM|TA_CENTER|TA_NOUPDATECP);
        TextOut(g_hdcMem, wDest/2, hDest-10, caption, lstrlen(caption));
        DeleteObject(SelectObject(g_hdcMem, hOldFont));
    }

    // replace windows procedure, start time and initiate first step
    if (lpPrevWndFunc == NULL)
        lpPrevWndFunc = (WNDPROC) SetWindowLongPtr(g_hWnd, GWL_WNDPROC, (long) WndProc);
    if (duration == 0)
	{
		g_step = _countof(SCA_Steps);
        InvalidateRect(g_hWnd, NULL, FALSE); // no duration => force a WM_PAINT for immediate draw of picture
        if (g_autoNext && g_autoDelay)
			SetTimer(g_hWnd, 'XFBN', g_autoDelay, NULL);
	}
    else
    {
	    g_step = 0;
        WndProc(g_hWnd, WM_TIMER, 'XFBN', 0); // first iteration right now
        SetTimer(g_hWnd, 'XFBN', duration/_countof(SCA_Steps), NULL);
    }
}

bool NextAuto()
{
    LPTSTR scan;
    if (g_autoNext == NULL)
        return false;
    if (*g_autoNext == '.') 
    {
        g_autoNext = g_autoBuffer;
        return false;
    }
    bool result = false;
    if (*g_autoNext == '=')
        g_autoNext++;
    for (scan = g_autoNext; *scan; scan++)
        if (*scan == ',') break;
    if (*scan)
    {
        TCHAR imgPath[MAX_PATH];
        *scan = '\0';
        PathCombine(imgPath, g_autoPath, g_autoNext);
        *scan = ',';
        g_autoNext = scan+1;

        int duration = StrToInt(g_autoNext);
        for (scan = g_autoNext; *scan; scan++)
            if (*scan == ',') break;
        if (*scan)
        {
            g_autoNext = scan+1;
            g_autoDelay = StrToInt(g_autoNext);
            for (scan = g_autoNext; *scan; scan++)
                if (*scan == ',') break;
            if (*scan && (scan[1] == '"'))
            {
                g_autoNext = scan+2;
                for (scan = g_autoNext; *scan; scan++)
                    if (*scan == '"') break;
                if (*scan)
                {
                    TCHAR caption[MAX_PATH];
                    lstrcpyn(caption, g_autoNext, scan-g_autoNext+1);
                    g_autoNext = scan+1;
                    NewImage(imgPath, caption, duration);
                    result = true;
                }
            }
        }
    }
    g_autoNext += lstrlen(g_autoNext);
    g_autoNext++;
    if (*g_autoNext == '\0') g_autoNext = g_autoBuffer;
    return result;
}

/*****************************************************
 * NSIS Plugin "stop" entrypoint
 *****************************************************/
extern "C"
void __declspec(dllexport) stop(HWND hwndParent, int string_size, TCHAR *variables, stack_t **stacktop)
{
    Abort();
}

/*****************************************************
 * NSIS Plugin "show" entrypoint
 *****************************************************/
extern "C"
void __declspec(dllexport) show(HWND hwndParent, int string_size, TCHAR *variables, stack_t **stacktop)
{
    EXDLL_INIT();
    Abort();

    // argument default values
    iHAlign = HALIGN_CENTER;
    iVAlign = VALIGN_CENTER;
    iFit    = FIT_BOTH;
    g_hWnd = NULL;
    captionColor = RGB(255,255,255);
    int duration = 1000; // transition duration in ms (default = 1s)
    TCHAR caption[MAX_PATH];
    caption[0] = '\0';

    // parse arguments
    TCHAR arg[MAX_PATH];
    LPTSTR argValue;
    while(!popstring(arg) && *arg == '/' && (argValue = StrChr(arg, '=')) != NULL)
    {
        *argValue++ = '\0';     // replace '=' by '\0'
        if(lstrcmpi(arg, TEXT("/hwnd")) == 0)
            StrToIntEx(argValue, STIF_SUPPORT_HEX, (int*) &g_hWnd);
        else if(lstrcmpi(arg, TEXT("/fit")) == 0)
        {
            if(lstrcmpi(argValue, TEXT("height")) == 0)		iFit = FIT_HEIGHT;
            else if(lstrcmpi(argValue, TEXT("width")) == 0)	iFit = FIT_WIDTH;
            else if(lstrcmpi(argValue, TEXT("stretch")) == 0)	iFit = FIT_STRETCH;
        }
        else if(lstrcmpi(arg, TEXT("/halign")) == 0)
        {
            if(lstrcmpi(argValue, TEXT("left")) == 0) iHAlign = HALIGN_LEFT;
            else if(lstrcmpi(argValue, TEXT("right")) == 0) iHAlign = HALIGN_RIGHT;
        }
        else if(lstrcmpi(arg, TEXT("/valign")) == 0)
        {
            if(lstrcmpi(argValue, TEXT("top")) == 0) iVAlign = VALIGN_TOP;
            else if(lstrcmpi(argValue, TEXT("bottom")) == 0) iVAlign = VALIGN_BOTTOM;
        }
        else if(lstrcmpi(arg, TEXT("/duration")) == 0)
            StrToIntEx(argValue, STIF_SUPPORT_HEX, &duration);
        else if(lstrcmpi(arg, TEXT("/caption")) == 0)
            lstrcpy(caption, argValue);
        else if(lstrcmpi(arg, TEXT("/ccolor")) == 0)
            StrToIntEx(argValue, STIF_SUPPORT_HEX, (int*) &captionColor);
        else if(lstrcmpi(arg, TEXT("/auto")) == 0)
        {
            lstrcpy(g_autoPath, argValue);
            PathRemoveFileSpec(g_autoPath);
            HGLOBAL hMem = GlobalAlloc(GMEM_FIXED, 32767*sizeof(TCHAR));
            DWORD count = GetPrivateProfileSection(getuservariable(INST_LANG), LPTSTR(hMem), 32767, argValue);
            if (count == 0)
            {
                count = GetPrivateProfileSection(TEXT("1033"), LPTSTR(hMem), 32767, argValue);
                if (count == 0)
                    count = GetPrivateProfileSection(TEXT("0"), LPTSTR(hMem), 32767, argValue);
            }
            if (count)
            {
                g_autoBuffer = LPTSTR(GlobalReAlloc(hMem, (count+1)*sizeof(TCHAR), 0));
                g_autoNext = g_autoBuffer;
            }
            else
                GlobalFree(hMem);
        }
    }

    // if target window not defined we'll search for default (the details listview)
    if (g_hWnd == NULL)
    {
        g_hWnd = FindWindowEx(hwndParent, NULL, TEXT("#32770"), NULL);
        if (g_hWnd == NULL)
            return;
        hwndParent = FindWindowEx(hwndParent, g_hWnd, TEXT("#32770"), NULL);
        if (hwndParent != NULL && !IsWindowVisible(hwndParent))
            g_hWnd = hwndParent;
        if (g_hWnd == NULL)
            return;
        HWND hWnd = GetDlgItem(g_hWnd, 1016);
        GetWindowRect(hWnd, &rDest);
        ScreenToClient(g_hWnd, (LPPOINT) &rDest.left);
        ScreenToClient(g_hWnd, (LPPOINT) &rDest.right);
    }
    else
        GetClientRect(g_hWnd, &rDest);

    // load new image
    if (arg[0] == '\0')
        return; // stop here if no filename

    if (g_autoNext != NULL)
        NextAuto();
    else
        NewImage(arg, caption, duration);
}

/*****************************************************
 * Dll entry point
 *****************************************************/
BOOL WINAPI DllMain(HANDLE hInst, ULONG ul_reason_for_call, LPVOID lpReserved)
{
    if (ul_reason_for_call == DLL_PROCESS_DETACH)
        Abort();
    return TRUE;
}

/*****************************************************
 * overriden WndProc for NSIS wizard pane
 *****************************************************/
static LRESULT CALLBACK WndProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    switch (uMsg)
    {
    case WM_TIMER:
        if (wParam == 'XFBN')
        {
            if (g_step == _countof(SCA_Steps))
            {
                Abort(true);
                if (!NextAuto())
                {
                    Abort();
                }
                return 0;
            }
            HDC hDC = GetDC(hWnd);
            const BLENDFUNCTION ftn = { AC_SRC_OVER, 0, SCA_Steps[g_step++], 0 };
            AlphaBlend(hDC, rDest.left, rDest.top, wDest, hDest, g_hdcMem, 0, 0, wDest, hDest, ftn);
            ReleaseDC(hWnd, hDC);
            if (g_step == _countof(SCA_Steps))
            {
                if (g_autoNext && g_autoDelay)
                    SetTimer(hWnd, 'XFBN', g_autoDelay, NULL);
                else
                    KillTimer(hWnd, 'XFBN');
            }
            return 0;
        }
    case WM_PAINT:
        if (g_hdcMem)
        {
            PAINTSTRUCT ps;
            HDC hDC = BeginPaint(hWnd, &ps); 
            CallWindowProc(lpPrevWndFunc, hWnd, uMsg, wParam, lParam);
            BitBlt(hDC, rDest.left, rDest.top, wDest, hDest, g_hdcMem, 0, 0, SRCCOPY);
            EndPaint(hWnd, &ps); 
            return 0;
        }
        break;

    case WM_CLOSE:
        Abort();
        break;
    case WM_COMMAND:
        if(LOWORD(wParam) == IDCANCEL || LOWORD(wParam) == IDOK || LOWORD(wParam) == IDABORT)
            Abort();
        break;

    default:
        break;
    }
    return CallWindowProc(lpPrevWndFunc, hWnd, uMsg, wParam, lParam);
}
