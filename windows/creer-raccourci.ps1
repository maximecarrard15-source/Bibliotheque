param(
    [string]$LauncherPath,
    [string]$ShortcutName = "Ma Bibliotheque"
)

# Cree un raccourci "Ma Bibliotheque" avec l'icone de l'application,
# sur le Bureau et dans le menu Demarrer.

if (-not $LauncherPath -or -not (Test-Path $LauncherPath)) { exit 0 }

$wsh = New-Object -ComObject WScript.Shell
$root = Split-Path -Parent $LauncherPath
$icon = Join-Path $root "icons\icon.ico"
if (-not (Test-Path $icon)) { $icon = Join-Path $root "icons\icon-512.png" }

$targets = @(
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('Programs')
)

foreach ($dir in $targets) {
    if (-not $dir) { continue }
    try {
        $linkPath = Join-Path $dir ($ShortcutName + ".lnk")
        $sc = $wsh.CreateShortcut($linkPath)
        $sc.TargetPath = $LauncherPath
        $sc.WorkingDirectory = $root
        $sc.IconLocation = $icon + ",0"
        $sc.Description = "Application de gestion de bibliotheque personnelle"
        $sc.Save()
    } catch {}
}
