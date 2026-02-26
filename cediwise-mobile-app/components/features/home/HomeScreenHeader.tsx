import {
  Header,
  LargeHeader,
  ScalingView,
  ScrollHeaderProps,
  ScrollLargeHeaderProps,
  ScrollViewWithHeaders
} from '@codeherence/react-native-header';
import { User } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StoredUserData } from '@/utils/auth';
import { Avatar, Button } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const hitSlop = { top: 12, left: 12, bottom: 12, right: 12 };

const styles = StyleSheet.create({
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export interface HomeScreenHeaderProps {
  user: StoredUserData;
  title: string;
  subtitle: string;
  onProfilePress: () => void;
  showProfileButton?: boolean;
}

function HomeScreenHeaderInner({
  user,
  title,
  subtitle,
  onProfilePress,
  showProfileButton = true,
}: HomeScreenHeaderProps) {
  return (
    <View className="px-5 pt-3 mb-6 flex flex-row items-start justify-between">
      <View className="gap-3 flex-1">
        <Text className="text-white text-[28px] font-bold" numberOfLines={2}>
          {title}
        </Text>
        <Text className="text-muted-foreground text-sm mt-1">{subtitle}</Text>
      </View>
      {showProfileButton && (
        <Pressable
          onPress={onProfilePress}
          hitSlop={hitSlop}
          style={({ pressed }) => [styles.profileButton, { opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Avatar alt={user.name ?? 'User'} size="sm">
            <Avatar.Image source={{ uri: user.avatar }} />
            <Avatar.Fallback>
              {user.name?.split(' ')[0]?.charAt(0) ?? 'U'}
              {user.name?.split(' ')[1]?.charAt(0) ?? 'K'}
            </Avatar.Fallback>
          </Avatar>
        </Pressable>
      )}
    </View>
  );
}

const HeaderComponent = (props: ScrollHeaderProps) => {
  return (
    <Header
      showNavBar={props.showNavBar}
      headerCenter={<Text>CediWise</Text>}
      headerRight={<Button isIconOnly>
        <User color="#94A3B8" size={20} />
      </Button>}
    />
  )
}

const LargeHeaderComponent = (props: ScrollLargeHeaderProps) => {
  return (
    <LargeHeader>
      <ScalingView scrollY={props.scrollY}>
        <View className="flex-row items-center gap-2">
          <Text className="text-primary text-3xl font-bold">CediWise</Text>
          <Text className="text-muted-foreground text-sm">Welcome back</Text>
          <Text className="text-muted-foreground text-sm">Here&apos;s your financial overview</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Button isIconOnly>
            <User color="#94A3B8" size={20} />
          </Button>
        </View>
      </ScalingView>
    </LargeHeader>
  );
}

export const ExpandHeader = ({ children }: { children: React.ReactNode }) => {
  const { bottom } = useSafeAreaInsets();

  return (
    <ScrollViewWithHeaders
      HeaderComponent={HeaderComponent}
      LargeHeaderComponent={LargeHeaderComponent}
      contentContainerStyle={{ paddingBottom: bottom }}
    >
      {children}
    </ScrollViewWithHeaders>
  );
}


export const HomeScreenHeader = memo(HomeScreenHeaderInner);
