# ==========================================
# CeX Price Tracker Scraper
# Parte 1
# ==========================================

$ErrorActionPreference = "Stop"

$archivoLista = ".\idList.txt"
$archivoJson = ".\web\juegos.json"
$archivoJs = ".\web\juegos.js"
$archivoHistorial = ".\web\historial.json"

$OutputEncoding = [System.Text.Encoding]::UTF8

$fechaRastreo = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

#------------------------------------------
# Comprobar lista de IDs
#------------------------------------------

if (!(Test-Path $archivoLista)) {

    Write-Host "No existe idList.txt" -ForegroundColor Red
    Read-Host
    exit

}

# Leer IDs ignorando lÃ­neas vacÃ­as y comentarios
$ids = Get-Content $archivoLista |
Where-Object {

    $_.Trim() -ne "" -and
    -not $_.Trim().StartsWith("#")

}

if ($ids.Count -eq 0) {

    Write-Host "La lista de juegos estÃ¡ vacÃ­a." -ForegroundColor Red
    Read-Host
    exit

}

#------------------------------------------
# Cargar historial de precios
#------------------------------------------

if (Test-Path $archivoHistorial) {

    try {

        $historialPrecios = Get-Content $archivoHistorial -Raw | ConvertFrom-Json -AsHashtable

    }
    catch {

        $historialPrecios = @{}

    }

}
else {

    $historialPrecios = @{}

}

#------------------------------------------
# Cabeceras HTTP
#------------------------------------------

$headers = @{

    "User-Agent" = "Mozilla/5.0"
    "Accept" = "application/json"

}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "      CeX Price Tracker"
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

#------------------------------------------
# Recorrer todos los IDs
#------------------------------------------

foreach ($id in $ids) {

    $url = "https://wss2.cex.es.webuy.io/v3/boxes/$id/detail"

    Write-Host "Consultando $id..." -ForegroundColor Yellow

    $respuesta = $null

    for ($intento = 1; $intento -le 3; $intento++) {

        try {

            $respuesta = Invoke-RestMethod `
                -Uri $url `
                -Method GET `
                -Headers $headers

            break

        }
        catch {

            Write-Host "Intento $intento fallido." -ForegroundColor DarkYellow

            Start-Sleep -Seconds 2

        }

    }

    if ($null -eq $respuesta) {

        Write-Host "No se pudo obtener el juego." -ForegroundColor Red
        Write-Host ""
        continue

    }

    if ($respuesta.response) {

        $ack = $respuesta.response.ack
        $box = $respuesta.response.data.boxDetails[0]

    }
    else {

        $ack = $respuesta.ack
        $box = $respuesta.data.boxDetails

        if ($box -is [array]) {

            $box = $box[0]

        }

    }

    if ($ack -ne "Success") {

        Write-Host "Respuesta invÃ¡lida." -ForegroundColor Red
        continue

    }

    $juego = [PSCustomObject]@{

        id                  = $box.boxId
        nombre              = $box.boxName

        categoria           = $box.categoryName

        precioVale          = $box.exchangePrice
        precioEfectivo      = $box.cashPrice
        precioVenta         = $box.sellPrice
        precioAnterior      = $box.previousPrice

        stock               = $box.ecomQuantityOnHand

        ultimaActualizacion = $box.lastPriceUpdatedDate

        imagen              = $box.imageUrls.large

        fechaRastreo        = $fechaRastreo

    }

    Write-Host "Juego: $($juego.nombre) - Precio: $($juego.precioVale)"

    $indice = -1

    for ($i = 0; $i -lt $historial.Count; $i++) {

        if ($historial[$i].id -eq $juego.id) {

            $indice = $i
            break

        }

    }

    if ($indice -ge 0) {

        $precioAnterior = $historial[$indice].precioVale

        if ($precioAnterior -ne $juego.precioVale) {

            Write-Host "Cambio de precio: $($juego.nombre)" -ForegroundColor Green
            Write-Host "$precioAnterior € -> $($juego.precioVale) €"

            if (-not $historialPrecios.ContainsKey($juego.id)) {

                $historialPrecios[$juego.id] = @()

            }

            $lista = @($historialPrecios[$juego.id])

            $lista += [PSCustomObject]@{
                fecha  = $fechaRastreo
                precio = $juego.precioVale
        }

        $historialPrecios[$juego.id] = $lista

        }

        $historial[$indice] = $juego

    }
    else {

        $historial += $juego

        if (-not $historialPrecios.ContainsKey($juego.id)) {

            $historialPrecios[$juego.id] = @()

        }

        $lista = @($historialPrecios[$juego.id])

        $lista += [PSCustomObject]@{
            fecha  = $fechaRastreo
            precio = $juego.precioVale
        }

        $historialPrecios[$juego.id] = $lista

        Write-Host "Added: $($juego.nombre)" -ForegroundColor Cyan

    }

    Start-Sleep -Seconds 3

}

#------------------------------------------
# Guardar juegos.json
#------------------------------------------

$historial |
Sort-Object nombre |
ConvertTo-Json -Depth 10 |
Out-File $archivoJson -Encoding utf8

#------------------------------------------
# Guardar historial
#------------------------------------------

$historialPrecios |
ConvertTo-Json -Depth 20 |
Out-File $archivoHistorial -Encoding utf8

#------------------------------------------
# Generar juegos.js
#------------------------------------------

$json = $historial |
Sort-Object nombre |
ConvertTo-Json -Depth 10

$javascript = @"
// ===================================================
// Archivo generado automaticamente por scrapper.ps1
// NO EDITAR MANUALMENTE
// ===================================================

const juegos = $json;
"@

$javascript | Out-File $archivoJs -Encoding utf8

#------------------------------------------
# Generar historial.js
#------------------------------------------

$historialJson = $historialPrecios | ConvertTo-Json -Depth 20

$historialJavascript = @"
// ===================================================
// Archivo generado automáticamente por scrapper.ps1
// NO EDITAR MANUALMENTE
// ===================================================

const historial = $historialJson;
"@

$historialJavascript | Out-File ".\web\historial.js" -Encoding utf8

#------------------------------------------
# Resumen
#------------------------------------------

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Rastreo finalizado correctamente" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Juegos procesados : $($historial.Count)"
Write-Host "JSON generado     : $archivoJson"
Write-Host "JS generado       : $archivoJs"
Write-Host "JSON generado     : $archivoHistorial"
Write-Host "JS generado       : $historialJavascript"
Write-Host ""

Read-Host "Pulsa ENTER para salir"