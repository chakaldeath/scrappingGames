$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$juegosJson = Join-Path $root "web\juegos.json"
$historialJson = Join-Path $root "web\historial.json"
$historialJs = Join-Path $root "web\historial.js"

if (!(Test-Path $juegosJson)) {

    Write-Host "No existe juegos.json" -ForegroundColor Red
    Read-Host
    exit

}

$juegos = Get-Content $juegosJson -Raw | ConvertFrom-Json

$historial = @()

foreach($juego in $juegos){

    $historial += [PSCustomObject]@{

        id = $juego.id

        historial = @(
            [PSCustomObject]@{

                fecha = $juego.fechaRastreo

                vale = $juego.precioVale

                efectivo = $juego.precioEfectivo

            }
        )

    }

}

$historial |
ConvertTo-Json -Depth 20 |
Out-File $historialJson -Encoding utf8

$js = @"
// Generado automáticamente

const historial = $($historial | ConvertTo-Json -Depth 20);
"@

$js | Out-File $historialJs -Encoding utf8

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Historial inicial creado" -ForegroundColor Green
Write-Host "Juegos: $($historial.Count)"
Write-Host "==================================" -ForegroundColor Green
Read-Host