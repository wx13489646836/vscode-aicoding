; Copyright (c) Microsoft Corporation. All rights reserved.
; Licensed under the MIT License.

#define AppName "VS Code AI Coding"
#ifndef AppVersion
#define AppVersion "1.115.0"
#endif
#define ExcludedPaths "*.log,Thumbs.db,.DS_Store"

[Setup]
AppId={{B2C14D08-1E63-47A9-9E14-AC8F498C8E48}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=VS Code AI Coding
DefaultDirName=D:\VSCodeAICoding
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
AllowNoIcons=yes
OutputDir=..\..\dist-installer
OutputBaseFilename=VSCodeAICodingSetup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile=..\..\resources\win32\code.ico
UninstallDisplayIcon={app}\VSCodeAICoding.exe

[Files]
Source: "bin\VSCodeAICoding.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\..\VSCode-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\resources\chat-templates\*"; DestDir: "{app}\resources\app\resources\chat-templates"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\vibe-demo\*"; DestDir: "{app}\vibe-demo"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "D:\vibe-demo\fixtures\*"; DestDir: "D:\vibe-demo\fixtures"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\VSCodeAICoding.exe"; WorkingDir: "{app}"; IconFilename: "{app}\VSCodeAICoding.exe"
Name: "{group}\{#AppName}"; Filename: "{app}\VSCodeAICoding.exe"; WorkingDir: "{app}"; IconFilename: "{app}\VSCodeAICoding.exe"

[Run]
Filename: "{app}\VSCodeAICoding.exe"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent
