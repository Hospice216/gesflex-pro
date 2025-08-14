@echo off
echo 🧹 Nettoyage des fichiers errones
echo ================================

echo.
echo 📝 Suppression du fichier erroné...
del "hell -ExecutionPolicy Bypass -File deploy-fix.ps1" 2>nul

echo.
echo 💾 Commit du nettoyage...
git add . 2>nul
git commit -m "🧹 Cleanup: Remove erroneous file" 2>nul

echo.
echo 🚀 Push du nettoyage...
git push origin main 2>nul

echo.
echo ✅ Nettoyage termine !
echo.
pause
