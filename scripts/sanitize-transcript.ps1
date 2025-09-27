param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }
$content = [System.IO.File]::ReadAllText($path)
# Apply sanitization hooks in render points
$content = $content.Replace('return text;','return cleanMojibake(text);')
$content = $content.Replace('{exchange.message}','{cleanMojibake(exchange.message)}')
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Sanitized transcript renderers in AIAssistantPage.jsx"
