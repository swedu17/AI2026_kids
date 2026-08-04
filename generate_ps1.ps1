$script = @"
`$csvFile = (Get-ChildItem -Path `$PSScriptRoot -Filter "*.csv")[0].FullName
Write-Host "Reading CSV from: `$csvFile"
`$csv = Import-Csv -Path `$csvFile -Encoding UTF8

`$culture = [System.Globalization.CultureInfo]::InvariantCulture
`$style = [System.Globalization.NumberStyles]::Any
`$list = [System.Collections.Generic.List[PSCustomObject]]::new()

foreach (`$row in `$csv) {
    `$typeVal = `$row.'시설종류'
    `$nameVal = `$row.'대상시설명'
    `$roadAddr = `$row.'소재지도로명주소'
    `$jibunAddr = `$row.'소재지지번주소'
    `$latStr = `$row.'위도'
    `$lngStr = `$row.'경도'
    `$policeVal = `$row.'관할경찰서명'
    `$cctvVal = `$row.'CCTV설치여부'
    `$cctvCount = `$row.'CCTV설치대수'
    `$widthVal = `$row.'보호구역도로폭'

    `$lat = 0.0
    `$lng = 0.0

    if (`$latStr -and `$lngStr) {
        `$latParsed = [double]::TryParse(`$latStr.Trim(), `$style, `$culture, [ref]`$lat)
        `$lngParsed = [double]::TryParse(`$lngStr.Trim(), `$style, `$culture, [ref]`$lng)

        if (`$latParsed -and `$lngParsed) {
            if (`$lat -gt 30 -and `$lat -lt 40 -and `$lng -gt 120 -and `$lng -lt 135) {
                `$addr = `$roadAddr
                if ([string]::IsNullOrWhiteSpace(`$addr)) {
                    `$addr = `$jibunAddr
                }

                if (`$cctvVal -ne 'Y') {
                    `$cctvVal = 'N'
                }

                `$item = [PSCustomObject]@{
                    t = if (`$typeVal) { `$typeVal.Trim() } else { "" }
                    n = if (`$nameVal) { `$nameVal.Trim() } else { "" }
                    a = if (`$addr) { `$addr.Trim() } else { "" }
                    lat = [math]::Round(`$lat, 6)
                    lng = [math]::Round(`$lng, 6)
                    p = if (`$policeVal) { `$policeVal.Trim() } else { "" }
                    c = `$cctvVal
                    cc = if (`$cctvCount) { `$cctvCount.Trim() } else { "0" }
                    w = if (`$widthVal) { `$widthVal.Trim() } else { "" }
                }
                `$list.Add(`$item)
            }
        }
    }
}

`$json = `$list | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText("`$PSScriptRoot\data.json", `$json, [System.Text.Encoding]::UTF8)
`$jsContent = "window.KIDS_ZONE_DATA = " + `$json + ";"
[System.IO.File]::WriteAllText("`$PSScriptRoot\data.js", `$jsContent, [System.Text.Encoding]::UTF8)
Write-Host "Successfully generated data.json and data.js with `$(`$list.Count) records!"
"@

$utf8WithBom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText("c:\Users\CSE027\Desktop\AI2026_kids\build_data.ps1", $script, $utf8WithBom)
