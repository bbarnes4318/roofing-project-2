param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

# Read file
$content = [System.IO.File]::ReadAllText($path)

# 1) Guard metadata fields in the transcript modal header
$origHeader = '{transcriptSummary.metadata.callDate} • {transcriptSummary.metadata.duration} • {transcriptSummary.metadata.participantCount} participant(s)'
$guardHeader = '{(transcriptSummary?.metadata?.callDate) || ''''} • {(transcriptSummary?.metadata?.duration) || ''''} • {(transcriptSummary?.metadata?.participantCount ?? '''')} participant(s)'
if ($content.Contains($origHeader)) {
  $content = $content.Replace($origHeader, $guardHeader)
}

# 2) Normalize TranscriptHistory selection into expected transcriptSummary shape
$patternSelect = [regex]'onTranscriptSelect=\{\(transcript\)\s*=>\s*\{[\s\S]*?setShowTranscriptModal\(true\);[\s\S]*?setShowTranscriptHistory\(false\);\s*\}\}'
$replacementSelect = @'
onTranscriptSelect={(transcript) => {
  // Normalize transcript into expected summary shape before opening modal
  try {
    const date = transcript?.date ? new Date(transcript.date) : new Date();
    const normalized = {
      metadata: {
        callDate: date.toLocaleDateString(),
        callTime: date.toLocaleTimeString(),
        duration: transcript?.duration || 'Unknown',
        participantCount: (transcript?.metadata?.participantCount) || 2,
        project: selectedProject ? {
          name: selectedProject.projectName || selectedProject.name,
          number: selectedProject.projectNumber,
          address: selectedProject.address || selectedProject.customer?.address
        } : null
      },
      executiveSummary: transcript?.preview || transcript?.title || '',
      keyDecisions: [],
      actionItems: [],
      materialsList: [],
      risks: [],
      fullTranscript: transcript?.fullTranscript || [],
      actions: []
    };
    setTranscriptSummary(normalized);
  } catch (_) {
    setTranscriptSummary({
      metadata: { callDate: '', callTime: '', duration: '', participantCount: '', project: null },
      executiveSummary: transcript?.title || '',
      keyDecisions: [],
      actionItems: [],
      materialsList: [],
      risks: [],
      fullTranscript: [],
      actions: []
    });
  }
  setShowTranscriptModal(true);
  setShowTranscriptHistory(false);
}}
'@
if ($patternSelect.IsMatch($content)) {
  $content = $patternSelect.Replace($content, $replacementSelect, 1)
}

# Write file without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
Write-Output "Applied transcript history fixes v2 (metadata guards + selection normalization + no BOM)."
