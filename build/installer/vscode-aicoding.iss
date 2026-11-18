; Copyright (c) Microsoft Corporation. All rights reserved.
; Licensed under the MIT License.

#define AppName "VS Code AI Coding"
#define AppExe "Code - OSS.exe"
#ifndef AppVersion
#define AppVersion "1.115.0"
#endif
#ifndef AppSource
#error "Build the Win32 x64 distribution and pass its path as AppSource."
#endif

[Setup]
AppId={{B2C14D08-1E63-47A9-9E14-AC8F498C8E48}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=VS Code AI Coding
DefaultDirName={localappdata}\Programs\VS Code AI Coding
DefaultGroupName={#AppName}
DisableDirPage=no
DisableProgramGroupPage=yes
OutputDir=..\..\dist-installer
OutputBaseFilename=VSCodeAICodingSetup
Compression=lzma2/normal
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
MinVersion=10.0.17763
SetupIconFile=..\..\resources\win32\code.ico
UninstallDisplayIcon={app}\resources\app\resources\win32\code.ico

[Languages]
Name: "chinesesimplified"; MessagesFile: ".\ChineseSimplified.isl"

[Files]
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{userdocs}\VS Code AI Coding\商品详情图演示"; Flags: uninsneveruninstall

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Parameters: "--user-data-dir ""{localappdata}\VS Code AI Coding\User Data"" --extensions-dir ""{localappdata}\VS Code AI Coding\Extensions"" --disable-updates --skip-welcome --skip-release-notes ""{userdocs}\VS Code AI Coding\商品详情图演示"""; WorkingDir: "{app}"; IconFilename: "{app}\resources\app\resources\win32\code.ico"; IconIndex: 0; Comment: "启动 VS Code AI Coding"
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"; Parameters: "--user-data-dir ""{localappdata}\VS Code AI Coding\User Data"" --extensions-dir ""{localappdata}\VS Code AI Coding\Extensions"" --disable-updates --skip-welcome --skip-release-notes ""{userdocs}\VS Code AI Coding\商品详情图演示"""; WorkingDir: "{app}"; IconFilename: "{app}\resources\app\resources\win32\code.ico"; IconIndex: 0; Comment: "启动 VS Code AI Coding"

[Run]
Filename: "{app}\{#AppExe}"; Parameters: "--user-data-dir ""{localappdata}\VS Code AI Coding\User Data"" --extensions-dir ""{localappdata}\VS Code AI Coding\Extensions"" --disable-updates --skip-welcome --skip-release-notes ""{userdocs}\VS Code AI Coding\商品详情图演示"""; WorkingDir: "{app}"; Description: "立即启动 VS Code AI Coding"; Flags: nowait postinstall skipifsilent
