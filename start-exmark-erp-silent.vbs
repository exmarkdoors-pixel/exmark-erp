Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(currentDir, "start-exmark-erp.bat")

WshShell.Run """" & batPath & """", 0, False
