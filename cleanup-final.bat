@echo off
echo 🧹 Nettoyage Final du Projet GesFlex Pro
echo =========================================
echo.

echo 📁 Déplacement des fichiers de corrections restants...
move "CORRECTIONS_*.md" docs\old-analysis\ 2>nul
move "VENTES_*.md" docs\old-analysis\ 2>nul
move "ARRIVAGES_*.md" docs\old-analysis\ 2>nul
move "PRODUITS_*.md" docs\old-analysis\ 2>nul
move "DASHBOARD_*.md" docs\old-analysis\ 2>nul
move "VISUAL_*.md" docs\old-analysis\ 2>nul
move "FINAL_*.md" docs\old-analysis\ 2>nul
move "IMMEDIATE_*.md" docs\old-analysis\ 2>nul
move "MANUAL_*.md" docs\old-analysis\ 2>nul
move "RLS_*.md" docs\old-analysis\ 2>nul
move "CURRENCY_*.md" docs\old-analysis\ 2>nul
move "TROUBLESHOOTING_*.md" docs\old-analysis\ 2>nul
move "CONFIGURATION_*.md" docs\old-analysis\ 2>nul
move "PRODUCTION_*.md" docs\old-analysis\ 2>nul

echo.
echo 🗑️ Suppression des fichiers temporaires restants...
del "s -File deploy-fix.ps1" 2>nul
del "cleanup-*.bat" 2>nul
del "cleanup-*.ps1" 2>nul

echo.
echo 📊 Structure finale du projet:
dir /b /ad

echo.
echo 📁 Contenu du dossier docs:
dir /b docs

echo.
echo 🧹 Nettoyage final terminé !
echo 📋 Projet maintenant propre et organisé
echo 🚀 Prêt pour l'analyse et les corrections !
echo.
pause
