import { Stack } from 'expo-router';

export default function QueueLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                headerTitle: 'Queue',
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}

