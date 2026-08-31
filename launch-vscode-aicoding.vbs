' Copyright (c) Microsoft Corporation. All rights reserved.
' Licensed under the MIT License.

Option Explicit

Dim fileSystem, shell, appDirectory, launcher
Set fileSystem = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appDirectory = fileSystem.GetParentFolderName(WScript.ScriptFullName)
launcher = fileSystem.BuildPath(appDirectory, "start-vscode-dev.bat")

shell.CurrentDirectory = appDirectory
shell.Run Chr(34) & launcher & Chr(34), 0, False
