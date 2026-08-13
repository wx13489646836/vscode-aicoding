/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("VS Code AI Coding")]
[assembly: AssemblyDescription("VS Code AI Coding desktop launcher")]
[assembly: AssemblyCompany("VS Code AI Coding")]
[assembly: AssemblyProduct("VS Code AI Coding")]
[assembly: AssemblyVersion("1.115.0.0")]
[assembly: AssemblyFileVersion("1.115.0.0")]

internal static class VSCodeAICodingLauncher
{
	[STAThread]
	private static int Main(string[] args)
	{
		string appRoot = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
		string executable = Path.Combine(appRoot, "Code - OSS.exe");
		if (!File.Exists(executable))
		{
			MessageBox.Show(
				"The application files are incomplete. Please run the installer again.\n\nMissing: " + executable,
				"VS Code AI Coding",
				MessageBoxButtons.OK,
				MessageBoxIcon.Error
			);
			return 1;
		}

		string appData = Path.Combine(
			Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
			"CodeOSS-Traditional"
		);
		Directory.CreateDirectory(appData);

		StringBuilder arguments = new StringBuilder();
		arguments.Append("--skip-sessions-welcome --new-window");
		bool hasUserDataDirectory = false;
		foreach (string argument in args)
		{
			if (argument.Equals("--user-data-dir", StringComparison.OrdinalIgnoreCase) || argument.StartsWith("--user-data-dir=", StringComparison.OrdinalIgnoreCase))
			{
				hasUserDataDirectory = true;
				break;
			}
		}
		if (!hasUserDataDirectory)
		{
			arguments.Append(" --user-data-dir ");
			arguments.Append(QuoteArgument(appData));
		}
		foreach (string argument in args)
		{
			arguments.Append(' ');
			arguments.Append(QuoteArgument(argument));
		}

		ProcessStartInfo startInfo = new ProcessStartInfo();
		startInfo.FileName = executable;
		startInfo.Arguments = arguments.ToString();
		startInfo.WorkingDirectory = appRoot;
		startInfo.UseShellExecute = true;

		try
		{
			Process.Start(startInfo);
			return 0;
		}
		catch (Exception error)
		{
			MessageBox.Show(
				"The application failed to start.\n\n" + error.Message,
				"VS Code AI Coding",
				MessageBoxButtons.OK,
				MessageBoxIcon.Error
			);
			return 1;
		}
	}

	private static string QuoteArgument(string value)
	{
		if (string.IsNullOrEmpty(value))
		{
			return "\"\"";
		}

		return "\"" + value.Replace("\"", "\\\"") + "\"";
	}
}
