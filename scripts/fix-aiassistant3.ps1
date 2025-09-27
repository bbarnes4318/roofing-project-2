param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

$content = [System.IO.File]::ReadAllText($path)

# 1) Ensure live transcript uses sanitizer
$content = [Regex]::Replace($content, 'return\s+text\s*;', 'return cleanMojibake(text);')

# 2) Ensure full transcript message uses sanitizer
$content = $content.Replace('{exchange.message}', '{cleanMojibake(exchange.message)}')

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Applied sanitizer hooks to AIAssistantPage.jsx"
