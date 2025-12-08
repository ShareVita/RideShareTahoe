param(
    [Parameter(Mandatory = $true)]
    [string]$ENV_FILE
)

# --- 1. Get and Extract Dynamic Keys ---

# Run status command and capture output into a single string
$SupabaseStatus = npx supabase status -o env | Out-String;

# Regex to find the specific key and capture its value
$ServicePattern = 'SERVICE_ROLE_KEY=(?:\s*")?([^"\s]+)';
$PublishablePattern = 'PUBLISHABLE_KEY=(?:\s*")?([^"\s]+)';

# 1. Capture Service Key Value
$ServiceMatch = [regex]::Match($SupabaseStatus, $ServicePattern);
$ServiceKeyRawValue = $ServiceMatch.Groups[1].Value;

# 2. Capture Publishable Key Value
$PublishableMatch = [regex]::Match($SupabaseStatus, $PublishablePattern);
$PublishableKeyRawValue = $PublishableMatch.Groups[1].Value; 

if (-not $ServiceKeyRawValue -or -not $PublishableKeyRawValue) {
    Write-Error 'Error: Key values could not be extracted from the Supabase status output.';
    exit 1;
}

# --- 2. Capture and Replace Content (Line-by-Line) ---

# Explicitly capture the entire file content into the $NewContent variable.
$NewContent = @(
    Get-Content -Path $ENV_FILE | ForEach-Object {
        if ($_ -match '^SUPABASE_SERVICE_ROLE_KEY=') {
            "SUPABASE_SERVICE_ROLE_KEY=$ServiceKeyRawValue"
        }
        elseif ($_ -match '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=') {
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PublishableKeyRawValue"
        }
        # Keep all other lines as is
        else {
            $_
        }
    }
)

# --- 3. Write Once ---

$NewContent | Set-Content -Path $ENV_FILE;

Write-Host "✅ Supabase SERVICE_ROLE_KEY and PUBLISHABLE_KEY successfully updated in $ENV_FILE.";