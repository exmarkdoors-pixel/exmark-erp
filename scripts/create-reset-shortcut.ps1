$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = $ws.CreateShortcut("$desktop\Reset Super Admin Password.lnk")
$shortcut.TargetPath = "C:\EXMARK-Releases\reset-super-admin-password.bat"
$shortcut.WorkingDirectory = "C:\EXMARK-Releases"
$shortcut.Description = "Physical Air-Gapped Super Admin Password Recovery"
$shortcut.Save()
Write-Host "Desktop shortcut created successfully."
