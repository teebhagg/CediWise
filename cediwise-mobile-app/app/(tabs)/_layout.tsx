import { CustomTabBar } from '@/components/CustomTabBar';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { BookOpen, TrendingUp, Wallet, Zap } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Wallet color={color as string} size={size} />,
                }}
            />
            <Tabs.Screen
                name="budget"
                options={{
                    title: 'Budget',
                    tabBarIcon: ({ color, size }) => <Zap color={color as string} size={size} />,
                }}
            />
            <Tabs.Screen
                name="literacy"
                options={{
                    title: 'Learn',
                    tabBarIcon: ({ color, size }) => <BookOpen color={color as string} size={size} />,
                }}
            />
            <Tabs.Screen
                name="investment"
                options={{
                    title: 'Invest',
                    tabBarIcon: ({ color, size }) => <TrendingUp color={color as string} size={size} />,
                }}
            />
        </Tabs>
    );
}

