import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { FlatList, View, Text, Dimensions, SafeAreaView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Commerce } from '~/domain/entities/commerceEntity';
import { CommerceService } from '~/domain/services/commerceService';
import { SearchWrapper } from '~/presentation/components/searchWrapper';
import { CommerceCard } from '~/presentation/components/cardCommerce';
import { getThemedStyles } from '~/presentation/styles/theme';

type RootStackParamList = {
  CommerceDetail: { commerceId: number };
};
export const CommerceList = () => {
  const [commerces, setCommerces] = useState<Commerce[]>();
  const commerceService = CommerceService.getInstance();
  const navigate = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = getThemedStyles();

  const handleGetCommerces = async () => {
    const commerces = await commerceService.getAllCommerces();
    setCommerces(commerces);
  };

  useEffect(() => {
    handleGetCommerces();
  }, []);

  const renderCommerceItem = ({ item }: { item: Commerce }) => (
    <CommerceCard item={item} />
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Text className="m-4 text-left text-2xl">¿Qué quieres comer hoy?</Text>
        <SearchWrapper>
          <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
            <FlatList
              data={commerces}
              renderItem={renderCommerceItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
              numColumns={2}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </SearchWrapper>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};
