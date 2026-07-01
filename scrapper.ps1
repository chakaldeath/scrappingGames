# ==========================================
# CeX Tracker Scraper v2
# ==========================================

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$web = Join-Path $root "web"

$idFile = Join-Path $root "idList.txt"

$juegosJson = Join-Path $web "juegos.json"
$juegosJs = Join-Path $web "juegos.js"

$historialJson = Join-Path $web "historial.json"
$historialJs = Join-Path $web "historial.js"

if (!(Test-Path $web)) {
    New-Item -ItemType Directory -Path $web | Out-Null
}

$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# ==========================================
# Leer IDs
# ==========================================

$ids = Get-Content $idFile |
ForEach-Object { $_.Trim() } |
Where-Object { $_ -ne "" -and -not $_.StartsWith("#") }

# ==========================================
# Cargar juegos
# ==========================================

$juegos = @()

if (Test-Path $juegosJson) {

    try {

        $tmp = Get-Content $juegosJson -Raw | ConvertFrom-Json

        if ($tmp) {
            $juegos = @($tmp)
        }

    }
    catch {}

}

# ==========================================
# Cargar historial
# ==========================================

$historial = @()

if (Test-Path $historialJson) {
    try {
        $tmp = Get-Content $historialJson -Raw | ConvertFrom-Json
        if ($tmp) {
            # Forzamos con @() para que siempre sea un array controlable
            $historial = @($tmp) 
        }
    }
    catch {}
}


# ==========================================
# API
# ==========================================

function Get-CexGame($id){

    $url="https://wss2.cex.es.webuy.io/v3/boxes/$id/detail"

    try{

        $r=Invoke-RestMethod `
            -Uri $url `
            -Headers @{
                "User-Agent"="Mozilla/5.0"
            }

        if($r.response){
            return $r.response.data.boxDetails[0]
        }

        if($r.data.boxDetails -is [array]){
            return $r.data.boxDetails[0]
        }

        return $r.data.boxDetails

    }
    catch{

        Write-Host "Error $id" -ForegroundColor Red
        return $null

    }

}

# ==========================================
# Procesar juegos
# ==========================================

foreach($id in $ids){

    Write-Host "Consultando $id..." -ForegroundColor Yellow

    $box=Get-CexGame $id

    if(!$box){continue}

    $juego=[PSCustomObject]@{

        id=$box.boxId
        nombre=$box.boxName
        categoria=$box.categoryName

        precioVale=$box.exchangePrice
        precioEfectivo=$box.cashPrice
        precioVenta=$box.sellPrice
        precioAnterior=$box.previousPrice

        stock=$box.ecomQuantityOnHand

        ultimaActualizacion=$box.lastPriceUpdatedDate

        imagen=$box.imageUrls.medium

        fechaRastreo=$fecha

    }

    # -----------------------
    # Actualizar juegos.json
    # -----------------------

    $indice=-1

    for($i=0;$i -lt $juegos.Count;$i++){

        if($juegos[$i].id -eq $juego.id){

            $indice=$i
            break

        }

    }

    if($indice -ge 0){

        $juegos[$indice]=$juego

    }else{

        $juegos+=$juego

    }

    # -----------------------
    # Buscar historial
    # -----------------------

    $hist=-1

    for($i=0;$i -lt $historial.Count;$i++){

        if($historial[$i].id -eq $juego.id){

            $hist=$i
            break

        }

    }

    if($hist -lt 0){

        $historial += [PSCustomObject]@{

            id=$juego.id

            historial=@(
                [PSCustomObject]@{

                    fecha=$fecha
                    vale=$juego.precioVale
                    efectivo=$juego.precioEfectivo

                }
            )

        }

        Write-Host "Nuevo historial" -ForegroundColor Green

    }
    else{

        $lista=@($historial[$hist].historial)

        $ultimo=$lista[-1]

        if($ultimo.vale -ne $juego.precioVale){

            Write-Host "Cambio de precio -> $($juego.precioVale) €" -ForegroundColor Cyan

            $lista += [PSCustomObject]@{

                fecha=$fecha
                vale=$juego.precioVale
                efectivo=$juego.precioEfectivo

            }

            $historial[$hist].historial=$lista

        }

    }

    Start-Sleep -Seconds 2

}

# ============================================
# Guardar juegos.json
# ============================================

$juegos=$juegos|Sort-Object nombre

$juegos |
ConvertTo-Json -Depth 10 |
Out-File $juegosJson -Encoding utf8

# ============================================
# Generar juegos.js
# ============================================

$js=@"
// ============================================
// Generado automáticamente
// ============================================

const juegos = $($juegos | ConvertTo-Json -Depth 10);
"@

$js | Out-File $juegosJs -Encoding utf8

# ============================================
# Guardar historial.json
# ============================================

$historial = $historial | Sort-Object id

# Cambiamos la tubería por -InputObject para proteger la estructura del array
ConvertTo-Json -InputObject $historial -Depth 20 | Out-File $historialJson -Encoding utf8


# ============================================
# Generar historial.js
# ============================================

$js=@"
// ============================================
// Generado automáticamente
// ============================================

const historial = $($historial | ConvertTo-Json -Depth 20);
"@

$js | Out-File $historialJs -Encoding utf8

# ============================================
# Resumen
# ============================================

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "Scraping finalizado correctamente" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Juegos    : $($juegos.Count)"
Write-Host "Historial : $($historial.Count)"
Write-Host ""
Write-Host "Generados:"
Write-Host "  juegos.json"
Write-Host "  juegos.js"
Write-Host "  historial.json"
Write-Host "  historial.js"
Write-Host ""

Read-Host "Pulsa ENTER para salir"
