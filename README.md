<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1etqAMwONnD6e7C7neFqWSvB_AYzm2cIF

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Modèle de sourcing PRISM

- Le moteur demande désormais **au moins 10 sujets distincts** par requête et les classe par **densité décroissante de sources**.
- Chaque sujet est enrichi d'**au minimum 5 sources vérifiées** (objectif 8 à 12) couvrant gauche/centre/droite. Le score de fiabilité récompense les articles dépassant ce seuil.
- Un **pool de sources de référence** (Reuters, Le Monde, Guardian, etc.) complète automatiquement les récits sous-documentés tout en conservant un lien de recherche fiable.
- Un **jeu de sujets stratégiques de secours** (transition juste, IA, cybersécurité, finance durable, etc.) garantit une couverture éditoriale minimale même sans accès API.
- Le cache local + Supabase conserve les articles enrichis pour accélérer les requêtes suivantes et éviter la surcharge de l'API Gemini.
