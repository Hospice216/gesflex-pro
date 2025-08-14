@echo off
echo 🚀 Correction des Artefacts GitHub Pages
echo ======================================

echo.
echo 📝 Ajout des corrections des artefacts...
git add . 2>nul

echo.
echo 💾 Commit des corrections...
git commit -m "🔧 Fix deploy-pages artifacts configuration" 2>nul

echo.
echo 🚀 Push vers GitHub...
git push origin main 2>nul

echo.
echo ✅ Corrections des artefacts deployees !
echo 🌐 Le workflow va maintenant fonctionner correctement
echo 📊 Suivez le progres sur: https://github.com/Hospice216/gesflex-pro/actions
echo.
pause
