param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

$content = [System.IO.File]::ReadAllText($path)

# Replace the unsafe metadata line inside the modal header paragraph with guarded expressions
$pattern = '(?s)(<p className="text-sm text-gray-600">)\s*\{[^}]+\}\s*•\s*\{[^}]+\}\s*•\s*\{[^}]+\}\s*participant\(s\)\s*(</p>)'
$replacement = '$1{(transcriptSummary?.metadata?.callDate) || ''''} • {(transcriptSummary?.metadata?.duration) || ''''} • {(transcriptSummary?.metadata?.participantCount ?? '''')} participant(s)$2'

$newContent = [Regex]::Replace($content, $pattern, $replacement)

# Write without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $newContent, $utf8NoBom)
Write-Output "Guarded transcript modal header metadata fields."
