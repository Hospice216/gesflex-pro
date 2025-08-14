#!/bin/bash

# 🚀 Script de Déploiement Automatique GesFlex Pro
# Auteur: GesFlex Pro Team
# Date: $(date)

set -e

echo "🚀 Démarrage du déploiement GesFlex Pro..."

# 🔍 Vérification des prérequis
echo "🔍 Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ Prérequis vérifiés"

# 📦 Installation des dépendances
echo "📦 Installation des dépendances..."
npm ci

# 🔍 Vérification des types TypeScript
echo "🔍 Vérification des types TypeScript..."
npm run type-check

# 🧹 Linting du code
echo "🧹 Linting du code..."
npm run lint

# 🏗️ Build de production
echo "🏗️ Build de production..."
npm run build

# 📊 Vérification du build
echo "📊 Vérification du build..."
if [ ! -d "dist" ]; then
    echo "❌ Le dossier dist n'a pas été créé"
    exit 1
fi

echo "✅ Build réussi !"
echo "📁 Contenu du dossier dist:"
ls -la dist/

# 🚀 Déploiement (optionnel)
if [ "$1" = "--deploy" ]; then
    echo "🚀 Déploiement en cours..."
    # Ici vous pouvez ajouter la logique de déploiement
    # Par exemple: déploiement sur Vercel, Netlify, etc.
fi

echo "🎉 Déploiement terminé avec succès !"
echo "🌐 Votre application est prête pour la production"

