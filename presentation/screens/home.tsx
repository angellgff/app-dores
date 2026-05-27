import { NavigationProp, useNavigation } from '@react-navigation/native';
import { CheckCircleIcon, Search } from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { useNotifications } from '../context/notificationContext';

import { Address } from '~/domain/entities/addressEntity';
import { useAddress } from '~/hooks/useAddress';
import { useCategories } from '~/hooks/useCategory';
import { useCommerces } from '~/hooks/useCommerces';
import { useHome } from '~/hooks/useHome';
import { useMenus } from '~/hooks/useMenus';
import { GlobalText } from '~/presentation/components/GlobalText';
import { AddressForm } from '~/presentation/components/addressForm';
import { UserAddressHeader } from '~/presentation/components/addressHeader';
import { AddressList } from '~/presentation/components/addressListModal';
import { BannerCarousel } from '~/presentation/components/bannerCarousel';
import { CardMenuList } from '~/presentation/components/cardMenuList';
import { CategoryGrid } from '~/presentation/components/categoryGrid';
import { getThemedStyles } from '~/presentation/styles/theme';

type RootStackParamList = {
  Subcategories: { categoryName: string; categoryId: number };
  MenuByCategory: { categoryId: number; subcategoryName?: string };
  CommerceList: undefined;
  CommerceDetail: { commerceId: number };
  AllMenus: undefined;
  CategoryList: undefined;
};

export default function Home() {
  const theme = getThemedStyles();
  const router = useNavigation<NavigationProp<RootStackParamList>>();

  const {
    banners,
    selectedAddress,
    loadingAddress,
    addressListModalVisible,
    addAddressModalVisible,
    handleAddressPress,
    handleAddressAdded,
    handleSelectAddress,
    setAddressListModalVisible,
    refetchBanners,
    setAddAddressModalVisible,
  } = useHome();
  const { categories, refetchCategories } = useCategories();
  const { refetchCommerces } = useCommerces();
  const { menus, loadingMenus, refetchMenus } = useMenus();
  const { addressArr, refreshAddresses } = useAddress();
  const { refreshNotifications } = useNotifications();
  const [loading, setLoading] = useState<boolean>(false);

  const renderAddressItem = ({ item }: { item: Address }) => {
    return (
      <TouchableOpacity
        className="flex-row items-center justify-between p-4"
        onPress={() => handleSelectAddress(item)}>
        <View className="flex-1">
          <Text className="text-base font-semibold">{item.title}</Text>
          <Text className="text-sm text-gray-600">{item.streets}</Text>
          {item.floor && <Text className="text-xs text-gray-500">Piso: {item.floor}</Text>}
          {item.reference && <Text className="text-xs text-gray-500">Ref: {item.reference}</Text>}
        </View>
        {item.id === selectedAddress?.id && <CheckCircleIcon color="#DA2919" size={24} />}
      </TouchableOpacity>
    );
  };

  const refreshData = async () => {
    if (loading) return; // Evitar múltiples recargas simultáneas
    setLoading(true);
    try {
      await Promise.all([
        refetchBanners(),
        refetchCategories(),
        refetchCommerces(),
        refetchMenus(),
        refreshAddresses(),
        refreshNotifications(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.backgroundColor }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshData}
            colors={[theme.primaryColor]}
            tintColor={theme.primaryColor}
          />
        }
        showsVerticalScrollIndicator={false}>
        <UserAddressHeader onPressAddress={handleAddressPress} />

        {/* Sección de bienvenida moderna */}
        <View style={{
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 12,
        }}>
          <GlobalText
            style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 4,
            }}>
            ¡Hola! 👋
          </GlobalText>
          <GlobalText
            variant="bold"
            style={{
              fontSize: 26,
              color: theme.primaryColor,
              letterSpacing: -0.5,
            }}>
            Bienvenido a Dores
          </GlobalText>
        </View>

        {/* Buscador moderno */}
        <TouchableOpacity
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F5F5F5',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
          onPress={() => router.navigate('CommerceDetail', { commerceId: 4 })}>
          <Search color={theme.primaryColor} size={22} />
          <GlobalText style={{
            marginLeft: 12,
            fontSize: 15,
            color: '#999',
            flex: 1,
          }}>
            ¿Qué quieres comer hoy?
          </GlobalText>
          <View style={{
            backgroundColor: theme.primaryColor,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
          }}>
            <GlobalText style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
              Buscar
            </GlobalText>
          </View>
        </TouchableOpacity>
        <View className="my-4">
          <CategoryGrid
            categories={categories}
            onCategoryPress={(category) =>
              router.navigate('MenuByCategory', {
                categoryId: category.id,
                subcategoryName: undefined,
              })
            }
            onViewAllPress={() => router.navigate('CategoryList')}
          />

          {/* Banner Carousel */}
          {banners && banners.length > 0 && (
            <View className="my-4">
              <BannerCarousel banners={banners} />
            </View>
          )}

          <View className="mb-4 flex-row justify-between px-4">
            <GlobalText className="text-lg font-medium">Productos</GlobalText>
            <GlobalText
              className="text-lg font-medium text-[#DA2919]"
              onPress={() => router.navigate('CommerceDetail', { commerceId: 4 })}>
              Ver todos
            </GlobalText>
          </View>

          {loadingMenus ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator size="large" color={theme.primaryColor} />
              <Text style={{ marginTop: 8, fontSize: 14, color: '#666' }}>Cargando productos...</Text>
            </View>
          ) : menus.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 14, color: '#999' }}>No hay productos disponibles</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 8, paddingBottom: 100, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {menus.slice(0, 8).map((item, index) => (
                <CardMenuList key={`menu-${item.commerceId}-${item.id}-${index}`} menu={item} commerceId={item.commerceId} commerceStatus />
              ))}
            </View>
          )}
        </View>

        {/* Address List Modal */}
        <AddressList
          addresses={addressArr}
          loading={loadingAddress}
          renderAddressItem={renderAddressItem}
          addressListModalVisible={addressListModalVisible}
          setAddressListModalVisible={setAddressListModalVisible}
          setAddAddressModalVisible={setAddAddressModalVisible}
        />

        {/* Add Address Modal */}
        <AddressForm
          visible={addAddressModalVisible}
          onClose={() => setAddAddressModalVisible(false)}
          onAddressAdded={handleAddressAdded}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
