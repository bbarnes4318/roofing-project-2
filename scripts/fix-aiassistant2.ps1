param()
$ErrorActionPreference = 'Stop'
$path = 'c:\Users\jimbo\roofing-project-2\src\components\pages\AIAssistantPage.jsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

function Add-After {
    param(
        [string]$Text,
        [string]$Anchor,
        [string]$Insert
    )
    $idx = $Text.IndexOf($Anchor)
    if ($idx -ge 0) {
        $pos = $idx + $Anchor.Length
        return $Text.Substring(0,$pos) + "`r`n" + $Insert + "`r`n" + $Text.Substring($pos)
    }
    return $Text
}

$content = [System.IO.File]::ReadAllText($path)

$anchor = 'const [isSendingMessage, setIsSendingMessage] = useState(false);'

# Add cleanMojibake() if missing
if ($content -notmatch 'const\s+cleanMojibake\s*=') {
    $clean = @"
    // Cleans common mojibake/garbled sequences from transcript text
    const cleanMojibake = (s) => {
        if (s == null) return '';
        let out = String(s);
        // Replace common bullet/separators
        out = out.split('Ã¢|‚¬|¢').join('•');
        // Remove clusters like 'Ã...|...|...'
        out = out.replace(/Ã[^\s]*\|[^\s]*\|[^\s]*/g, '');
        // Remove stray 'Â'
        out = out.replace(/Â/g, '');
        // Normalize whitespace
        out = out.replace(/\s{2,}/g, ' ').trim();
        return out;
    };
"@
    $content = Add-After -Text $content -Anchor $anchor -Insert $clean
}

# Add missing voice/compose/input state + refs if missing
if ($content -notmatch 'const\s+vapiRef\s*=') {
    $decls = @"
    // Voice and composer state/refs
    const vapiRef = useRef(null);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [isVoiceLive, setIsVoiceLive] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [inputHeight, setInputHeight] = useState(0);
"@
    $content = Add-After -Text $content -Anchor $anchor -Insert $decls
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Injected cleanMojibake and missing state/refs into AIAssistantPage.jsx"
