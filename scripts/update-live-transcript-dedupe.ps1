param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

# Read file
$content = [System.IO.File]::ReadAllText($path)

# Replace the IIFE body inside the live transcript with a de-duplicating renderer
$pattern = '(?s)\{\(\(\)\s*=>\s*\{\s*.*?\s*\}\)\(\)\}'
$replacement = @'
{(() => {
  // Render finalized lines (deduped) plus the in-progress live line (only if new)
  const rawLines = Array.isArray(voiceTranscript) ? voiceTranscript : [];
  const normalize = (s) => cleanMojibake(String(s || '')).trim();

  // Remove consecutive duplicates after normalization
  const normalized = [];
  for (let i = 0; i < rawLines.length; i++) {
    const txt = normalize(rawLines[i]);
    if (!txt) continue;
    if (normalized.length === 0 || normalized[normalized.length - 1] !== txt) {
      normalized.push(txt);
    }
  }

  // Keep only the last N lines for performance
  const safeLines = normalized.slice(-200);

  const live = normalize(liveTranscriptText || '');
  const lastFinal = safeLines.length > 0 ? safeLines[safeLines.length - 1] : '';
  const showLive = !!live && live !== lastFinal;

  return (
    <div className="space-y-1.5">
      {safeLines.map((ln, idx) => (
        <div key={idx} className="whitespace-pre-wrap break-words">{ln}</div>
      ))}
      {showLive && (
        <div className="whitespace-pre-wrap break-words opacity-80">{live}</div>
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
Write-Output "Applied live transcript de-duplication logic."
