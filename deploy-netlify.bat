@echo off
echo 🚀 Configuration Netlify GesFlex Pro
echo ===================================

echo.
echo 📝 Ajout de la configuration Netlify...
git add . 2>nul

echo.
echo 💾 Commit de la configuration...
git commit -m "🚀 Configuration Netlify - Alternative à GitHub Pages" 2>nul

echo.
echo 🚀 Push vers GitHub...
git push origin main 2>nul

echo.
echo ✅ Configuration Netlify deployee !
echo 🌐 Maintenant vous pouvez deployer sur Netlify
echo 📋 Instructions dans le README
echo.
pause
