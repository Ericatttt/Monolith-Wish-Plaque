import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { WishCard } from '../components/WishCard';
import { useWallet } from '../hooks/useWallet';
import { useWishes } from '../hooks/useWishes';
import { useProgram } from '../hooks/useProgram';
import { WishWithKey, WishStatus } from '../types';

export const MyWishesScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { publicKey, isConnected, connect, isLoading: walletLoading } = useWallet();
  const { wishes, isLoading, error, refresh } = useWishes(publicKey || undefined);
  const { updateWishStatus } = useProgram();

  const [selectedWish, setSelectedWish] = useState<WishWithKey | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerTitle: t('myWishes.title') });
  }, [i18n.language]);

  // 每次切回此页面时刷新（已连接才有意义）
  useFocusEffect(
    useCallback(() => {
      if (isConnected) {
        refresh();
      }
    }, [refresh, isConnected])
  );

  const handleWishPress = (wish: WishWithKey) => {
    if (wish.account.status !== WishStatus.Pending) {
      Alert.alert(t('myWishes.alerts.onlyPending'), t('myWishes.alerts.onlyPendingMsg'));
      return;
    }

    setSelectedWish(wish);
    setModalVisible(true);
  };

  const handleStatusUpdate = async (status: WishStatus) => {
    if (!selectedWish || !publicKey) return;

    setIsUpdating(true);

    try {
      const txSignature = await updateWishStatus(
        selectedWish.account.wishId.toNumber(),
        status
      );

      const statusText = status === WishStatus.Fulfilled
        ? t('myWishes.alerts.successFulfilled')
        : t('myWishes.alerts.successUnfulfilled');
      Alert.alert(
        t('myWishes.alerts.successTitle'),
        `${t('myWishes.alerts.successMsg', { status: statusText })}${txSignature.slice(0, 20)}...`
      );

      setModalVisible(false);
      setTimeout(() => refresh(), 2000);
    } catch (error: any) {
      Alert.alert(t('myWishes.alerts.errorTitle'), error.message || t('myWishes.alerts.defaultError'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectContainer}>
          <Text style={styles.connectEmoji}>🔒</Text>
          <Text style={styles.connectTitle}>{t('myWishes.connectTitle')}</Text>
          <Text style={styles.connectSubtitle}>{t('myWishes.connectSubtitle')}</Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connect}
            disabled={walletLoading}
          >
            {walletLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectButtonText}>{t('myWishes.connectButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.subtitleBar}>
        <Text style={styles.subtitleText}>{t('myWishes.subtitle', { count: wishes.length })}</Text>
      </View>

      {isLoading && wishes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C8360A" />
          <Text style={styles.loadingText}>{t('myWishes.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>⚠️</Text>
          <Text style={styles.emptyTitle}>{t('myWishes.loadError')}</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('myWishes.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : wishes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>✨</Text>
          <Text style={styles.emptyTitle}>{t('myWishes.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('myWishes.emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={wishes}
          keyExtractor={(item) => item.publicKey.toBase58()}
          renderItem={({ item }) => (
            <WishCard
              wish={item}
              onPress={() => handleWishPress(item)}
              showDonateButton={false}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              colors={['#C8360A']}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Status Update Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('myWishes.statusModal.title')}</Text>

            {selectedWish && (
              <View style={styles.wishInfo}>
                <Text style={styles.wishContent} numberOfLines={3}>
                  {selectedWish.account.content}
                </Text>
                <Text style={styles.wishMeta}>
                  {t('myWishes.statusModal.wishId', { id: selectedWish.account.wishId.toString() })}
                </Text>
              </View>
            )}

            <Text style={styles.questionText}>{t('myWishes.statusModal.question')}</Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.statusButton, styles.fulfilledButton]}
                onPress={() => handleStatusUpdate(WishStatus.Fulfilled)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.statusButtonEmoji}>✅</Text>
                    <Text style={styles.statusButtonText}>{t('myWishes.statusModal.fulfilled')}</Text>
                    <Text style={styles.statusButtonSubtext}>{t('myWishes.statusModal.fulfilledSub')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusButton, styles.unfulfilledButton]}
                onPress={() => handleStatusUpdate(WishStatus.Unfulfilled)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#333" />
                ) : (
                  <>
                    <Text style={styles.statusButtonEmoji}>📝</Text>
                    <Text style={styles.statusButtonText}>{t('myWishes.statusModal.unfulfilled')}</Text>
                    <Text style={styles.statusButtonSubtext}>{t('myWishes.statusModal.unfulfilledSub')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
              disabled={isUpdating}
            >
              <Text style={styles.cancelButtonText}>{t('myWishes.statusModal.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  connectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  connectEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  connectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C1810',
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 14,
    color: '#8B6E5A',
    textAlign: 'center',
    marginBottom: 32,
  },
  connectButton: {
    backgroundColor: '#C8360A',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitleBar: {
    backgroundColor: '#FDF0E8',
    paddingVertical: 7,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE0D4',
  },
  subtitleText: {
    fontSize: 13,
    color: '#C8360A',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B6E5A',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C1810',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8B6E5A',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: '#C8360A',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 24, 16, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C1810',
    marginBottom: 20,
    textAlign: 'center',
  },
  wishInfo: {
    backgroundColor: '#FFF8F0',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDE0D4',
  },
  wishContent: {
    fontSize: 14,
    color: '#4A3728',
    marginBottom: 6,
    lineHeight: 20,
  },
  wishMeta: {
    fontSize: 12,
    color: '#8B6E5A',
  },
  questionText: {
    fontSize: 15,
    color: '#4A3728',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  fulfilledButton: {
    backgroundColor: '#4CAF50',
  },
  unfulfilledButton: {
    backgroundColor: '#E09B20',
  },
  statusButtonEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusButtonSubtext: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8B6E5A',
    fontSize: 16,
  },
});
