; Copyright (c) Microsoft Corporation. All rights reserved.
; Licensed under the MIT License.

#define AppName "VS Code AI Coding"
#ifndef AppVersion
#define AppVersion "1.115.0"
#endif
#define ExcludedPaths ".git\*,.electron-cache\*,.portable-data\*,.vscode-test\*,coverage\*,dist-installer\*,portable-dist\*,test-results\*,test_data\*,*.log,*.snap.actual,*.tsbuildinfo,npm-debug.log,test-output.json,Thumbs.db,.DS_Store"

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
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\.build\electron\Code - OSS.exe

[Files]
Source: "..\..\.npmrc"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\.nvmrc"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\cglicenses.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\cgmanifest.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\CodeQL.yml"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\eslint.config.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\gulpfile.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\install-vscode-dev-deps.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\PORTABLE-README.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\product.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\SECURITY.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\start-vscode-dev.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\ThirdPartyNotices.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\tsfmt.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\.build\*"; DestDir: "{app}\.build"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\.portable-node\*"; DestDir: "{app}\.portable-node"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths},*.zip"
Source: "..\..\build\*"; DestDir: "{app}\build"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\cli\*"; DestDir: "{app}\cli"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\extensions\*"; DestDir: "{app}\extensions"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\out\*"; DestDir: "{app}\out"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\remote\*"; DestDir: "{app}\remote"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\resources\*"; DestDir: "{app}\resources"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"
Source: "..\..\vibe-demo\*"; DestDir: "{app}\vibe-demo"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#ExcludedPaths}"

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\start-vscode-dev.bat"; WorkingDir: "{app}"; IconFilename: "{app}\.build\electron\Code - OSS.exe"
Name: "{group}\{#AppName}"; Filename: "{app}\start-vscode-dev.bat"; WorkingDir: "{app}"; IconFilename: "{app}\.build\electron\Code - OSS.exe"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
	ResultCode: Integer;
	Ok: Boolean;
begin
	if CurStep = ssPostInstall then
	begin
		Ok := Exec(
			ExpandConstant('{cmd}'),
			'/C "' + ExpandConstant('{app}\install-vscode-dev-deps.bat') + '" --nopause',
			ExpandConstant('{app}'),
			SW_HIDE,
			ewWaitUntilTerminated,
			ResultCode
		);

		if (not Ok) or (ResultCode <> 0) then
		begin
			MsgBox(
				'Dependency setup failed. Open install-vscode-dev-deps.log in the install directory, then run install-vscode-dev-deps.bat again.',
				mbError,
				MB_OK
			);
		end;
	end;
end;
