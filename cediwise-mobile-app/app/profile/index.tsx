import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight, CreditCard, DollarSign, FileText, LogOut, Mail, Phone, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { LogoutModal } from '@/components/LogoutModal';
import { useAppToast } from '@/hooks/useAppToast';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalizationStatus } from '@/hooks/usePersonalizationStatus';
import { getDisplayContact } from '@/utils/auth';
import { log } from '@/utils/logger';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { showError } = useAppToast();
    const personalization = usePersonalizationStatus(user?.id);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleBackPress = async () => {
        try {
            await Haptics.selectionAsync();
        } catch {
            // ignore haptics failure
        }
        router.back();
    };

    const handleLogoutPress = async () => {
        try {
            await Haptics.selectionAsync();
        } catch {
            // ignore haptics failure
        }
        setShowLogoutModal(true);
    };

    const handleLogoutConfirm = async () => {
        try {
            await logout();
            setShowLogoutModal(false);
            router.replace('/auth');
        } catch (e) {
            log.error('Logout error:', e);
            showError('Logout failed', e instanceof Error ? e.message : 'Could not sign out');
        }
    };

    const contact = getDisplayContact(user);

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name[0].toUpperCase();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} edges={['top']} className="flex-1 bg-background">
            <ScrollView className="px-5 py-3 ">
                <View className="flex-1 gap-3">
                    {/* Header with Back Button */}
                    <View className="mb-7">
                        <BackButton onPress={handleBackPress} className="mb-4" />

                        <Text className="text-white text-3xl font-bold mb-1">Profile & Settings</Text>
                        <Text className="text-muted-foreground text-sm">
                            Manage your account and preferences
                        </Text>
                    </View>

                    {/* User Info Card */}
                    <Card className="">
                        <View className="items-center py-2">
                            {/* Avatar */}
                            <View className="w-20 h-20 rounded-full bg-emerald-600/10 border-2 border-emerald-500/40 justify-center items-center mb-4">
                                <Text className="text-3xl font-bold text-emerald-400">
                                    {getInitials(user?.name)}
                                </Text>
                            </View>

                            {/* Name */}
                            <Text className="text-white text-xl font-bold mb-1">
                                {user?.name || 'User'}
                            </Text>

                            {/* Contact (phone for phone auth, email otherwise) */}
                            <View className="flex-row items-center gap-1">
                                {contact.isPhone ? (
                                    <Phone color="#9CA3AF" size={14} />
                                ) : (
                                    <Mail color="#9CA3AF" size={14} />
                                )}
                                <Text className="text-sm text-muted-foreground">
                                    {contact.value || (contact.isPhone ? 'No phone' : 'No email')}
                                </Text>
                            </View>
                        </View>
                    </Card>

                    {/* Account Settings Section */}
                    <View className="mb-5 space-y-3">
                        <Text className="text-white text-lg font-semibold">Account Settings</Text>

                        <Card className="">
                            {/* Edit Profile - Coming Soon */}
                            <Pressable
                                style={({ pressed }) => [
                                    {
                                        opacity: pressed ? 0.7 : 1,
                                    },
                                ]}
                                disabled
                                className="flex-row items-center justify-between py-2"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-xl bg-sky-500/10 justify-center items-center">
                                        <UserIcon color="#60A5FA" size={20} />
                                    </View>
                                    <View>
                                        <Text className="text-white text-base font-semibold">Edit Profile</Text>
                                        <Text className="text-xs text-muted-foreground mt-0.5">Coming soon</Text>
                                    </View>
                                </View>
                                <ChevronRight color="#64748B" size={20} />
                            </Pressable>
                        </Card>
                    </View>

                    {/* Personalization */}
                    <View className="mb-5 space-y-3">
                        <Text className="text-white text-lg font-semibold">Personalization</Text>

                        <Pressable
                            onPress={async () => {
                                try {
                                    await Haptics.selectionAsync();
                                } catch {
                                    // ignore
                                }
                                router.push('/vitals?mode=edit');
                            }}
                            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                        >
                            <Card className="">
                                <View className="flex-row items-center justify-between py-2">
                                    <View style={{ flex: 1 }}>
                                        <Text className="text-white text-base font-semibold">
                                            Personalization settings
                                        </Text>
                                        <Text className="text-xs text-muted-foreground mt-0.5">
                                            {personalization.isLoading
                                                ? 'Checking…'
                                                : personalization.setupCompleted
                                                    ? 'Completed'
                                                    : 'Not set'}
                                        </Text>
                                    </View>
                                    <ChevronRight color="#64748B" size={20} />
                                </View>
                            </Card>
                        </Pressable>
                    </View>

                    {/* Budget tools */}
                    <View className="mb-5 space-y-3">
                        <Text className="text-white text-lg font-semibold">Budget tools</Text>

                        <Card className="">
                            <Pressable
                                onPress={async () => {
                                    try { await Haptics.selectionAsync(); } catch { }
                                    router.push('/recurring-expenses');
                                }}
                                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                                className="flex-row items-center justify-between py-3.5 px-1"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-xl bg-amber-500/10 justify-center items-center">
                                        <CreditCard color="#F59E0B" size={20} />
                                    </View>
                                    <View>
                                        <Text className="text-white text-base font-semibold">Recurring Expenses</Text>
                                        <Text className="text-xs text-muted-foreground mt-0.5">Subscriptions & regular payments</Text>
                                    </View>
                                </View>
                                <ChevronRight color="#64748B" size={20} />
                            </Pressable>
                            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 0 }} />
                            <Pressable
                                onPress={async () => {
                                    try { await Haptics.selectionAsync(); } catch { }
                                    router.push('/debt-dashboard');
                                }}
                                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                                className="flex-row items-center justify-between py-3.5 px-1"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-xl bg-rose-500/10 justify-center items-center">
                                        <DollarSign color="#EF4444" size={20} />
                                    </View>
                                    <View>
                                        <Text className="text-white text-base font-semibold">Debt Dashboard</Text>
                                        <Text className="text-xs text-muted-foreground mt-0.5">Loans & credit</Text>
                                    </View>
                                </View>
                                <ChevronRight color="#64748B" size={20} />
                            </Pressable>
                            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 0 }} />
                            <Pressable
                                onPress={async () => {
                                    try { await Haptics.selectionAsync(); } catch { }
                                    router.push('/budget-templates');
                                }}
                                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                                className="flex-row items-center justify-between py-3.5 px-1"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-xl bg-emerald-500/10 justify-center items-center">
                                        <FileText color="#10B981" size={20} />
                                    </View>
                                    <View>
                                        <Text className="text-white text-base font-semibold">Budget Templates</Text>
                                        <Text className="text-xs text-muted-foreground mt-0.5">Life-stage templates</Text>
                                    </View>
                                </View>
                                <ChevronRight color="#64748B" size={20} />
                            </Pressable>
                        </Card>
                    </View>

                    {/* Danger Zone */}
                    <View className="mb-6 space-y-3">
                        <Text className="text-white text-lg font-semibold">Account Actions</Text>

                        <Pressable
                            onPress={handleLogoutPress}
                            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                        >
                            <Card className="bg-rose-600/10 border border-rose-500/30">
                                <View className="flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-xl bg-rose-500/20 justify-center items-center">
                                        <LogOut color="#EF4444" size={20} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-rose-400 text-base font-semibold">Logout</Text>
                                        <Text className="text-xs text-muted-foreground mt-0.5">
                                            Sign out of your account
                                        </Text>
                                    </View>
                                    <ChevronRight color="#EF4444" size={20} />
                                </View>
                            </Card>
                        </Pressable>
                    </View>

                    {/* App Info */}
                    <View className="items-center py-5">
                        <Text className="text-xs text-slate-500">
                            CediWise v{Constants.expoConfig?.version ?? '0.0.1'}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-1">Your Personal Finance Companion</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Logout Confirmation Modal */}
            <LogoutModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogoutConfirm}
            />
        </SafeAreaView>
    );
}
