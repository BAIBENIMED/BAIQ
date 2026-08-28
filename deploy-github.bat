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
echo   IMPORTANT : ce projet inclut desormais un relais serveur
echo   (server.js) pour l'Assistant IA Gemini. Il faut deployer
echo   un "Web Service", et non plus un "Static Site".
echo.
echo   Sur render.com :
echo   1. New + -^> Web Service (PAS "Static Site")
echo   2. Connecter votre repo GitHub
echo   3. Build Command : npm install ^&^& npm run build
echo   4. Start Command : npm run start
echo   5. Onglet "Environment" -^> ajouter GEMINI_API_KEY (votre cle)
echo   6. Cliquer "Create Web Service"
echo.
echo   Sans etape 5, l'application fonctionne normalement mais
echo   l'Assistant IA restera en mode local (sans Gemini).
echo ============================================
pause
