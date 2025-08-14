@echo off
echo 🚀 Correction et Deploiement GesFlex Pro
echo ======================================

echo.
echo 📝 Ajout des fichiers modifiés...
git add .

echo.
echo 💾 Commit des corrections...
git commit -m "🔧 Correction des erreurs de deploiement - Homepage et Repository URL"

echo.
echo 🚀 Push vers GitHub...
git push origin main

echo.
echo ✅ Deploiement termine !
echo 🌐 Votre application sera disponible sur: https://hospice216.github.io/gesflex-pro
echo.
echo 📋 Prochaines etapes:
echo 1. Allez sur https://github.com/Hospice216/gesflex-pro
echo 2. Cliquez sur Settings > Pages
echo 3. Selectionnez "GitHub Actions" comme source
echo 4. Le deploiement se fera automatiquement
echo.
pause
