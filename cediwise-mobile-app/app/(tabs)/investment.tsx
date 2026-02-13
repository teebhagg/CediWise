import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface } from 'heroui-native';

export default function InvestmentScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-background">
    <StatusBar backgroundColor="black" barStyle="light-content" translucent={true} animated={true} />
      <View className="flex-1 px-5 py-6 justify-center items-center">
        <Surface variant='default' className="w-full items-center rounded-sm">
          <Text className="text-white text-2xl font-bold text-center">Investment Opportunities</Text>
          <Text className="text-muted-foreground text-base text-center">
            Coming soon! Explore curated investment options for Ghanaian investors.
          </Text>
        </Surface>
      </View>
    </SafeAreaView>
  );
}

