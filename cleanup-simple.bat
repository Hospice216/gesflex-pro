@echo off
echo 🧹 Nettoyage du Projet GesFlex Pro
echo ===================================
echo.

echo 📁 Création des dossiers d'organisation...
if not exist "docs" mkdir docs
if not exist "docs\old-analysis" mkdir docs\old-analysis
if not exist "docs\deployment-scripts" mkdir docs\deployment-scripts
if not exist "docs\guides" mkdir docs\guides

echo.
echo 📁 Déplacement des fichiers d'analyse...
move "ANALYSE_*.md" docs\old-analysis\ 2>nul
move "VERIFICATION_*.md" docs\old-analysis\ 2>nul
move "CORRECTION_*.md" docs\old-analysis\ 2>nul
move "MODIFICATIONS_*.md" docs\old-analysis\ 2>nul
move "RESUME_*.md" docs\old-analysis\ 2>nul
move "SOLUTION_*.md" docs\old-analysis\ 2>nul
move "TROUBLESHOOTING.md" docs\old-analysis\ 2>nul
move "FRONTEND_ADAPTATION_GUIDE.md" docs\old-analysis\ 2>nul

echo.
echo 🔧 Déplacement des scripts de déploiement...
move "deploy-*.bat" docs\deployment-scripts\ 2>nul
move "deploy-*.ps1" docs\deployment-scripts\ 2>nul
move "deploy.config.js" docs\deployment-scripts\ 2>nul

echo.
echo 📚 Déplacement des guides...
move "GUIDE_*.md" docs\guides\ 2>nul

echo.
echo 🗑️ Suppression des fichiers temporaires...
del "s -File deploy-fix.ps1" 2>nul
del "*.tmp" 2>nul
del "*.log" 2>nul

echo.
echo 📊 Structure finale du projet:
dir /b /ad

echo.
echo 🧹 Nettoyage terminé avec succès !
echo 📋 Fichiers organisés dans le dossier 'docs\'
echo 🚀 Projet prêt pour la suite !
echo.
pause
