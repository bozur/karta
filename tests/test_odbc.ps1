$drivers = @(
    "{ODBC Driver 17 for SQL Server}",
    "{SQL Server}",
    "{SQL Server Native Client 11.0}"
)

foreach ($driver in $drivers) {
    Write-Host "Testing Driver: $driver"
    $connString = "Driver=$driver;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"
    $conn = New-Object System.Data.Odbc.OdbcConnection
    $conn.ConnectionString = $connString
    try {
        $conn.Open()
        Write-Host "✅ SUCCESS with $driver"
        $conn.Close()
    } catch {
        Write-Host "❌ FAILED with $driver : $($_.Exception.Message)"
    }
    Write-Host "--------------------------------"
}
