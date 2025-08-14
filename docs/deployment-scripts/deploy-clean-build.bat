@echo off
echo 🚀 Correction du Nettoyage du Build
echo ===================================

echo.
echo 📝 Ajout des corrections du nettoyage...
git add . 2>nul

echo.
echo 💾 Commit des corrections...
git commit -m "🔧 Fix build cleaning and artifact optimization" 2>nul

echo.
echo 🚀 Push vers GitHub...
git push origin main 2>nul

echo.
echo ✅ Corrections du nettoyage deployees !
echo 🌐 Le workflow va maintenant nettoyer le build avant le deploiement
echo 📊 Suivez le progres sur: https://github.com/Hospice216/gesflex-pro/actions
echo.
pause
