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

# 1) Add cleanMojibake if missing
if ($content -notmatch 'const\s+cleanMojibake\s*=') {
    $cleanFunc = @"
    const cleanMojibake = (s) => {
        if (s == null) return '';
        let out = String(s);
        // Common bullet/separator
        out = out.split('Ã¢|‚¬|¢').join('•');
        // Remove common mojibake clusters like Ã°Å¸|…
        out = out.replace(/Ã[^\s]*\|[^\s]*\|[^\s]*/g, '');
        // Remove stray Â
        out = out.replace(/Â/g, '');
        // Normalize whitespace
        out = out.replace(/\s{2,}/g, ' ').trim();
        return out;
    };
"@
    $anchor = 'const [isSendingMessage, setIsSendingMessage] = useState(false);'
    $content = Add-After -Text $content -Anchor $anchor -Insert $cleanFunc
}

# 2) Add missing refs/states if missing
if ($content -notmatch 'const\s+vapiRef\s*=') {
    $decls = @"
    const vapiRef = useRef(null);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [isVoiceLive, setIsVoiceLive] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [inputHeight, setInputHeight] = useState(0);
"@
    $anchor2 = 'const [isSendingMessage, setIsSendingMessage] = useState(false);'
    $content = Add-After -Text $content -Anchor $anchor2 -Insert $decls
}

# 3) Replace live transcript return to use sanitizer
$content = $content.Replace('return text;','return cleanMojibake(text);')

# 4) Replace full transcript message to use sanitizer
$content = $content.Replace('{exchange.message}','{cleanMojibake(exchange.message)}')

# 5) Remove mojibake debug markers in console logs
$content = $content.Replace('Ã°Å¸|€|´ ','')
$content = $content.Replace('Ã°Å¸|€|´','')
$content = $content.Replace('Ã°Å¸|€|µ ','')
$content = $content.Replace('Ã°Å¸|€|µ','')

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "Fixed AIAssistantPage.jsx"
