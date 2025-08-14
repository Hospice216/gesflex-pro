@echo off
echo 🚀 Deploiement GesFlex Pro - Version Simple
echo ===========================================

echo.
echo 📝 Ajout des fichiers...
git add . 2>nul

echo.
echo 💾 Commit des corrections...
git commit -m "🔧 Fix MIME type errors - Add .nojekyll and optimize build" 2>nul

echo.
echo 🚀 Push vers GitHub...
git push origin main 2>nul

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
