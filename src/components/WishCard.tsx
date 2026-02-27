import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WishWithKey, WishStatus } from '../types';
import { formatDate, lamportsToSol, truncatePublicKey } from '../utils/solana';
import { WISH_STATUS_COLORS } from '../utils/constants';

interface WishCardProps {
  wish: WishWithKey;
  onDonate?: () => void;
  onPress?: () => void;
  showDonateButton?: boolean;
}

export const WishCard: React.FC<WishCardProps> = ({
  wish,
  onDonate,
  onPress,
  showDonateButton = true,
}) => {
  const { t } = useTranslation();
  const { account } = wish;
  const statusColor = WISH_STATUS_COLORS[account.status];
  const statusName = t(`status.${account.status}`);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusColor }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.nickname}>{account.nickname}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusName}</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(account.createdAt)}</Text>
      </View>

      <Text style={styles.content} numberOfLines={4}>
        {account.content}
      </Text>

      <View style={styles.footer}>
        <View style={styles.donationInfo}>
          <Text style={styles.donationLabel}>{t('wishCard.donationLabel')}</Text>
          <Text style={styles.donationAmount}>
            {lamportsToSol(account.totalDonations).toFixed(4)} SOL
          </Text>
        </View>

        {showDonateButton && (
          <TouchableOpacity style={styles.donateButton} onPress={onDonate}>
            <Text style={styles.donateButtonText}>{t('wishCard.supportButton')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.wishId}>{t('wishCard.wishId', { id: account.wishId.toString() })}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  donationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donationLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
  donationAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  donateButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  wishId: {
    fontSize: 10,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'right',
  },
});
