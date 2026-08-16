@echo off
echo ============================================
echo   BAIQ Finance - Deploiement GitHub + Render
echo ============================================
echo.
set /p GITHUB_USER="Entrez votre nom d'utilisateur GitHub: "
echo.
echo Connexion au depot GitHub...
git remote add origin https://github.com/%GITHUB_USER%/baiq-finance-platform.git
git branch -M main
git push -u origin main
echo.
echo ============================================
echo   Code pousse sur GitHub avec succes !
echo.
echo   Maintenant sur render.com :
echo   1. New + -^> Static Site
echo   2. Connecter votre repo GitHub
echo   3. Build Command : npm run build
echo   4. Publish Directory : dist
echo   5. Cliquer "Create Static Site"
echo ============================================
pause
