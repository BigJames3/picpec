# Met à jour LOCAL_IP, APP_BASE_URL et API_BASE_URL automatiquement
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress

(Get-Content backend\.env) `
  -replace 'API_BASE_URL=http://[\d.]+:3000', "API_BASE_URL=http://${ip}:3000" `
  -replace 'APP_BASE_URL=http://[\d.]+:3000', "APP_BASE_URL=http://${ip}:3000" `
  -replace 'LOCAL_IP=[\d.]+', "LOCAL_IP=${ip}" |
  Set-Content backend\.env

(Get-Content mobile-app\.env) `
  -replace 'EXPO_PUBLIC_API_URL=http://[\d.]+:3000', "EXPO_PUBLIC_API_URL=http://${ip}:3000" |
  Set-Content mobile-app\.env

Write-Host "✅ IP mise à jour : $ip"
Write-Host ""
Write-Host "👉 Lance maintenant dans deux terminaux séparés :"
Write-Host "   Terminal 1 : cd backend && npm run start:dev"
Write-Host "   Terminal 2 : cd mobile-app && npx expo start --lan"
