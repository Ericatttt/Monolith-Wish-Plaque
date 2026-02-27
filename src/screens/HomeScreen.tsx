import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { WishCard } from '../components/WishCard';
import { useWishes } from '../hooks/useWishes';
import { useProgram } from '../hooks/useProgram';
import { useWallet } from '../hooks/useWallet';
import { WishWithKey } from '../types';
import { solToLamports } from '../utils/solana';

export const HomeScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { wishes, isLoading, error, refresh } = useWishes();
  const { donateToWish } = useProgram();
  const { publicKey, isConnected } = useWallet();

  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [selectedWish, setSelectedWish] = useState<WishWithKey | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerTitle: t('home.title') });
  }, [i18n.language]);

  // 每次切回此页面时刷新愿望列表
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleDonatePress = (wish: WishWithKey) => {
    if (!isConnected) {
      Alert.alert(t('home.alerts.noWallet'), t('home.alerts.noWalletMsg'));
      return;
    }

    setSelectedWish(wish);
    setDonationModalVisible(true);
  };

  const handleDonateConfirm = async () => {
    if (!selectedWish || !publicKey) return;

    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('home.alerts.invalidAmount'), t('home.alerts.invalidAmountMsg'));
      return;
    }

    setIsDonating(true);

    try {
      const lamports = solToLamports(amount);
      const txSignature = await donateToWish(
        selectedWish.account.wishId.toNumber(),
        selectedWish.account.owner,
        lamports
      );

      Alert.alert(t('home.alerts.successTitle'), `${t('home.alerts.successMsg')}${txSignature.slice(0, 20)}...`);
      setDonationModalVisible(false);
      setDonationAmount('');
      setTimeout(() => refresh(), 2000);
    } catch (error: any) {
      Alert.alert(t('home.alerts.errorTitle'), error.message || t('home.alerts.defaultError'));
    } finally {
      setIsDonating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.subtitleBar}>
        <Text style={styles.subtitleText}>{t('home.subtitle')}</Text>
      </View>

      {isLoading && wishes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>{t('home.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>⚠️</Text>
          <Text style={styles.emptyTitle}>加载失败</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#FF5722', borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : wishes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>✨</Text>
          <Text style={styles.emptyTitle}>{t('home.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('home.emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={wishes}
          keyExtractor={(item) => item.publicKey.toBase58()}
          renderItem={({ item }) => (
            <WishCard wish={item} onDonate={() => handleDonatePress(item)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              colors={['#FF5722']}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Donation Modal */}
      <Modal
        visible={donationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDonationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('home.donationModal.title')}</Text>

            {selectedWish && (
              <>
                <Text style={styles.wishPreview} numberOfLines={2}>
                  {selectedWish.account.content}
                </Text>
                <Text style={styles.wishOwner}>
                  {t('home.donationModal.wisher')}: {selectedWish.account.nickname}
                </Text>
              </>
            )}

            <Text style={styles.inputLabel}>{t('home.donationModal.amountLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.1"
              keyboardType="decimal-pad"
              value={donationAmount}
              onChangeText={setDonationAmount}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setDonationModalVisible(false);
                  setDonationAmount('');
                }}
                disabled={isDonating}
              >
                <Text style={styles.cancelButtonText}>{t('home.donationModal.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleDonateConfirm}
                disabled={isDonating}
              >
                {isDonating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t('home.donationModal.confirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  subtitleBar: {
    backgroundColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
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
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  listContent: {
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  wishPreview: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  wishOwner: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#FF5722',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
