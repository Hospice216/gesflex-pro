Write-Host "🚀 Correction et Deploiement GesFlex Pro" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host ""
Write-Host "📝 Ajout des fichiers modifiés..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "💾 Commit des corrections..." -ForegroundColor Yellow
git commit -m "🔧 Correction des erreurs de deploiement - Homepage et Repository URL"

Write-Host ""
Write-Host "🚀 Push vers GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "✅ Deploiement termine !" -ForegroundColor Green
Write-Host "🌐 Votre application sera disponible sur: https://hospice216.github.io/gesflex-pro" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Prochaines etapes:" -ForegroundColor Yellow
Write-Host "1. Allez sur https://github.com/Hospice216/gesflex-pro" -ForegroundColor White
Write-Host "2. Cliquez sur Settings > Pages" -ForegroundColor White
Write-Host "3. Selectionnez 'GitHub Actions' comme source" -ForegroundColor White
Write-Host "4. Le deploiement se fera automatiquement" -ForegroundColor White
Write-Host ""
Read-Host "Appuyez sur Entree pour continuer..."
