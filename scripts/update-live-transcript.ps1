param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

# Read file
$content = [System.IO.File]::ReadAllText($path)

# 1) Ensure the live transcript container shows ~8–10 lines and wraps anywhere
$content = $content -replace 'h-40 md:h-48','h-44 md:h-56'
$content = $content -replace "style=\{\{ wordBreak: 'break-word',","style={{ wordBreak: 'break-word', overflowWrap: 'anywhere',"

# 2) Replace the IIFE body inside the live transcript with a multi-line renderer
$pattern = '(?s)\{\(\(\)\s*=>\s*\{\s*.*?\s*\}\)\(\)\}'
$replacement = @'
{(() => {
  // Render all finalized lines plus the in-progress live line
  const lines = Array.isArray(voiceTranscript) ? voiceTranscript : [];
  const live = String(liveTranscriptText || '').trim();
  return (
    <div className="space-y-1.5">
      {lines.slice(-200).map((ln, idx) => (
        <div key={idx} className="whitespace-pre-wrap break-words">{cleanMojibake(String(ln || ''))}</div>
      ))}
      {live && (
        <div className="whitespace-pre-wrap break-words opacity-80">{cleanMojibake(live)}</div>
      )}
    </div>
  );
})()}
'@

# Only replace the first occurrence after the Live Transcription header to be safe
$marker = 'Live Transcription'
$idx = $content.IndexOf($marker)
if ($idx -ge 0) {
  $head = $content.Substring(0,$idx)
  $tail = $content.Substring($idx)
  $tailNew = [Regex]::Replace($tail, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $replacement }, 1)
  $content = $head + $tailNew
}
else {
  # Fallback: global first occurrence
  $content = [Regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $replacement }, 1)
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Updated live transcript to multi-line with wrapping and height adjustments."
