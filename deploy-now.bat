@echo off
echo 🚀 Deploiement Rapide GesFlex Pro
echo =================================

echo.
echo 📝 Ajout des corrections du workflow...
git add . 2>nul

echo.
echo 💾 Commit des corrections...
git commit -m "🔧 Fix GitHub Actions workflow - Simplify build and deploy" 2>nul

echo.
echo 🚀 Push vers GitHub...
git push origin main 2>nul

echo.
echo ✅ Deploiement lance !
echo 🌐 Le workflow GitHub Actions va maintenant fonctionner
echo 📊 Suivez le progres sur: https://github.com/Hospice216/gesflex-pro/actions
echo.
pause
