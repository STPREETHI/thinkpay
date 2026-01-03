# 💎 ThinkPay - Smart Virtual Vaults

ThinkPay is a next-generation FinTech application that leverages AI-powered virtual vaults to provide intelligent spending isolation and financial security.

## 🚀 Quick Start (Local Development)

1. **Clone the repository** to your local machine.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Set Environment Variables**:
   Create a `.env` file in the root directory and add your keys. You must retrieve these from your [Firebase Console](https://console.firebase.google.com/):
   ```env
   # Google Gemini AI Key
   API_KEY=your_gemini_api_key

   # Firebase Production Credentials
   VITE_FIREBASE_API_KEY=AIzaSyCAraCMzeV7dizNSSJuoGnY5kyh8btQpR8
   VITE_FIREBASE_AUTH_DOMAIN=smartwalletai-92d10.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=smartwalletai-92d10
   VITE_FIREBASE_STORAGE_BUCKET=smartwalletai-92d10.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=677662690594
   VITE_FIREBASE_APP_ID=1:677662690594:web:57bc91ce581d5bcfb5e97b
   VITE_FIREBASE_MEASUREMENT_ID=G-C91KCY0J4X
   ```
4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🛠 Deployment Instructions

### 1. Firebase Project Setup
- Create a project at [Firebase Console](https://console.firebase.google.com/).
- **Authentication**: Enable the "Email/Password" provider under the Build > Authentication menu.
- **Cloud Firestore**: Enable in "Production Mode".
- **Security Rules**: Deploy the rules found in `firestore.rules` to the "Rules" tab in the Firebase Console. This prevents users from accessing each other's data.

### 2. Configure Environment Variables
Ensure all `VITE_FIREBASE_*` variables are configured in your hosting provider's (Vercel, Netlify, or Firebase Hosting) environment settings dashboard.

### 3. Build & Deploy
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Deploy to Vercel**: Connect your Git repo and it will automatically detect the settings.

## 🏗 System Architecture
- **Frontend**: React 19 + Tailwind CSS + Lucide Icons.
- **AI Engine**: Google Gemini API (`gemini-3-flash-preview`) for autonomous categorization.
- **Database**: Firebase Firestore for real-time cloud data storage.
- **Auth**: Firebase Auth for secure, production-grade identity management.
- **Isolation Logic**: Virtual vaults enforce partition-level spending limits, protecting your core savings from lifestyle overspending.
