# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Firebase (Android)

The app uses Firebase (`@react-native-firebase/app`, Analytics, Google Sign-In). For Android builds:

1. In [Firebase Console](https://console.firebase.google.com), select your project (or create one) and add an Android app with package name `com.cediwise.app`.
2. Download **google-services.json** and replace the placeholder at the project root: `cediwise-mobile-app/google-services.json`.

The placeholder file is only so EAS prebuild can run; replace it with your real file for Analytics and Google Sign-In to work.

## Supabase (auth & data)

The app needs Supabase URL and anon key at build time. For EAS Build, set environment variables in the [Expo dashboard](https://expo.dev) (Project → Secrets) or in `eas.json`:

- `EXPO_PUBLIC_SUPABASE_URL` – your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_KEY` – your Supabase anon (public) key

If these are missing in a production APK, the app will open but redirect to the auth screen and show "App not configured" if you try to sign in. Set them so the built app can reach your Supabase project.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
