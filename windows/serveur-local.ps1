param(
    [int]$Port = 8899
)

# Mini-serveur HTTP local pour l'application Bibliotheque.
# Aucune installation requise : utilise uniquement PowerShell et .NET preinstalles.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$mimeTypes = @{
    ".html"        = "text/html; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".js"          = "application/javascript; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".gif"         = "image/gif"
    ".svg"         = "image/svg+xml"
    ".ico"         = "image/x-icon"
    ".txt"         = "text/plain; charset=utf-8"
    ".woff2"       = "font/woff2"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try {
    $listener.Start()
} catch {
    Write-Host ""
    Write-Host "Impossible de demarrer le serveur : le port $Port est peut-etre deja utilise."
    Write-Host "Fermez l'autre fenetre Bibliotheque puis reessayez."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

$appUrl = "http://127.0.0.1:$Port/index.html"

try {
    Start-Process "msedge.exe" -ArgumentList "--app=$appUrl"
} catch {
    try { Start-Process $appUrl } catch {}
}

Write-Host ""
Write-Host "=================================================="
Write-Host "  BIBLIOTHEQUE - serveur local demarre"
Write-Host "--------------------------------------------------"
Write-Host "  Adresse : $appUrl"
Write-Host ""
Write-Host "  Laissez cette fenetre ouverte pendant l'utilisation."
Write-Host "  Pour arreter : fermez cette fenetre (ou Ctrl+C)."
Write-Host "=================================================="
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
        $rawPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
        if ($rawPath -eq "/" -or $rawPath -eq "") { $rawPath = "/index.html" }

        $relative = $rawPath.TrimStart("/")
        $fullPath = [IO.Path]::GetFullPath((Join-Path $root $relative))

        $safe = $fullPath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)
        if ($safe -and $fullPath.Length -gt $root.Length) {
            $sep = $fullPath.Substring($root.Length, 1)
            $safe = ($sep -eq "\") -or ($sep -eq "/")
        }

        if (-not $safe -or -not (Test-Path $fullPath -PathType Leaf)) {
            $context.Response.StatusCode = 404
            $context.Response.Close()
            continue
        }

        $ext = [IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        if ($mimeTypes.ContainsKey($ext)) {
            $context.Response.ContentType = $mimeTypes[$ext]
        }

        $bytes = [IO.File]::ReadAllBytes($fullPath)
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.OutputStream.Close()
        $context.Response.Close()
    } catch {
        try { $context.Response.Abort() } catch {}
    }
}
