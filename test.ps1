$csvFile = (Get-ChildItem -Path $PSScriptRoot -Filter "*.csv")[0].FullName
$csv = Import-Csv -Path $csvFile -Encoding UTF8
$first = $csv[0]
Write-Host "Total rows: $($csv.Count)"
foreach ($prop in $first.psobject.properties) {
    Write-Host "$($prop.Name) = '$($prop.Value)'"
}
