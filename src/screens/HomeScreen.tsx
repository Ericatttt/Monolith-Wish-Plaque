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
          <ActivityIndicator size="large" color="#C8360A" />
          <Text style={styles.loadingText}>{t('home.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>⚠️</Text>
          <Text style={styles.emptyTitle}>{t('home.loadError')}</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('home.retry')}</Text>
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
              colors={['#C8360A']}
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
    backgroundColor: '#FFF8F0',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C1810',
    marginBottom: 16,
    textAlign: 'center',
  },
  wishPreview: {
    fontSize: 14,
    color: '#4A3728',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDE0D4',
  },
  wishOwner: {
    fontSize: 12,
    color: '#8B6E5A',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EDE0D4',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#2C1810',
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
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#EDE0D4',
  },
  cancelButtonText: {
    color: '#8B6E5A',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#C8360A',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
