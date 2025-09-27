param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

$content = [System.IO.File]::ReadAllText($path)

# Insert localStorage persistence after successful save
$anchor = 'setTranscriptId(saveResult.data.transcript.id);'
$insertion = @'
                                        // Persist to localStorage for history fallback
                                        try {
                                            const localKey = 'voiceTranscripts';
                                            const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
                                            const dateIso = saveResult.data.transcript.callDate || saveResult.data.transcript.createdAt || new Date().toISOString();
                                            const title = (saveResult.data.transcript.project?.projectName ? `${saveResult.data.transcript.project.projectName} — ` : 'Call — ') + new Date(dateIso).toLocaleString();
                                            const preview = saveResult.data.transcript.executiveSummary || (Array.isArray(saveResult.data.transcript.fullTranscript) && saveResult.data.transcript.fullTranscript[0]?.message) || '';
                                            const item = {
                                                id: saveResult.data.transcript.id,
                                                date: new Date(dateIso).toISOString(),
                                                title,
                                                preview,
                                                raw: saveResult.data.transcript
                                            };
                                            const next = [...existing.filter(it => it.id !== item.id), item].slice(-50);
                                            localStorage.setItem(localKey, JSON.stringify(next));
                                        } catch (_) {}
'@

if ($content.Contains($anchor)) {
  $content = $content.Replace($anchor, $anchor + "`n" + $insertion)
}

# Also add fallback local save when the network save throws
$catchAnchor = "console.error('[Vapi] Error saving transcript:', saveError);"
$catchInsertion = @'
                                    // Fallback: persist a minimal local item so history shows something
                                    try {
                                        const localKey = 'voiceTranscripts';
                                        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
                                        const dateIso = new Date().toISOString();
                                        const title = (selectedProject?.projectName || selectedProject?.name ? `${selectedProject.projectName || selectedProject.name} — ` : 'Call — ') + new Date(dateIso).toLocaleString();
                                        const preview = (enhancedSummary?.executiveSummary) || (Array.isArray(conversationToUse) && conversationToUse[0]?.message) || '';
                                        const temp = {
                                            id: `local_${Date.now()}`,
                                            date: dateIso,
                                            title,
                                            preview,
                                            raw: {
                                                id: undefined,
                                                callDate: dateIso,
                                                duration: enhancedSummary?.metadata?.duration || 'Unknown',
                                                executiveSummary: enhancedSummary?.executiveSummary || '',
                                                fullTranscript: conversationToUse || [],
                                                project: selectedProject ? { projectName: selectedProject.projectName || selectedProject.name } : null
                                            }
                                        };
                                        const next = [...existing, temp].slice(-50);
                                        localStorage.setItem(localKey, JSON.stringify(next));
                                    } catch (_) {}
'@

if ($content.Contains($catchAnchor)) {
  $content = $content.Replace($catchAnchor, $catchAnchor + "`n" + $catchInsertion)
}

# Write without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
Write-Output "Added local transcript storage for history fallback."
